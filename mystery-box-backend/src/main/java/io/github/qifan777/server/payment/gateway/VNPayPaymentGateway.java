package io.github.qifan777.server.payment.gateway;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.qifan777.server.dict.model.DictConstants.PayType;
import io.github.qifan777.server.order.entity.BaseOrder;
import io.github.qifan777.server.payment.config.VNPayProperties;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
@Slf4j
public class VNPayPaymentGateway implements PaymentGateway {
    private static final DateTimeFormatter VNPAY_DATE = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final VNPayProperties vnpayProperties;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${payment.mock-enabled:false}")
    private boolean mockPaymentEnabled;

    @Override
    public PayType payType() {
        return PayType.VN_PAY;
    }

    @Override
    public VNPayPrepayView prepay(BaseOrder baseOrder, int expiredMinutes, String notifyPath, String clientIp) {
        String cacheKey = "prepay:vnpay:" + baseOrder.id();
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            try {
                return objectMapper.readValue(cached, VNPayPrepayView.class);
            } catch (Exception ignored) {
                // regenerate
            }
        }
        assertConfigured();
        String resolvedIp = StringUtils.hasText(clientIp) ? clientIp.trim() : "127.0.0.1";
        BigDecimal payAmount = baseOrder.payment().payAmount();
        long amountMinor = payAmount.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).longValue();
        String createDate = LocalDateTime.now().format(VNPAY_DATE);
        String expireDate = LocalDateTime.now().plusMinutes(expiredMinutes).format(VNPAY_DATE);
        String ipnUrl = resolveUrl(vnpayProperties.getIpnUrl(), notifyPath);
        Map<String, String> params = new HashMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", vnpayProperties.getTmnCode());
        params.put("vnp_Amount", String.valueOf(amountMinor));
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", baseOrder.id());
        params.put("vnp_OrderInfo", StringUtils.hasText(baseOrder.remark()) ? baseOrder.remark() : "Mystery box order");
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", appendOrderIdToReturnUrl(baseOrder.id()));
        params.put("vnp_IpnUrl", ipnUrl);
        params.put("vnp_CreateDate", createDate);
        params.put("vnp_ExpireDate", expireDate);
        params.put("vnp_IpAddr", resolvedIp);
        String query = VNPaySignatureUtil.buildSignedQuery(params, vnpayProperties.getHashSecret());
        String paymentUrl = vnpayProperties.getPayUrl() + "?" + query;
        VNPayPrepayView view = new VNPayPrepayView(
                baseOrder.id(),
                payAmount,
                paymentUrl,
                appendOrderIdToReturnUrl(baseOrder.id()),
                vnpayProperties.isSandbox()
        );
        try {
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(view), expiredMinutes, TimeUnit.MINUTES);
        } catch (Exception ex) {
            log.warn("Failed to cache VNPay prepay for {}", baseOrder.id(), ex);
        }
        return view;
    }

    @Override
    public Optional<PaymentNotifyResult> parsePaymentNotify(String body, Map<String, String> params) {
        if (params == null || params.isEmpty()) {
            return Optional.empty();
        }
        if (!VNPaySignatureUtil.verify(params, vnpayProperties.getHashSecret())) {
            log.warn("VNPay IPN signature invalid order={}", params.get("vnp_TxnRef"));
            return Optional.empty();
        }
        if (!"00".equals(params.get("vnp_ResponseCode"))) {
            log.info("VNPay IPN non-success code={} order={}", params.get("vnp_ResponseCode"), params.get("vnp_TxnRef"));
            return Optional.empty();
        }
        String orderId = params.get("vnp_TxnRef");
        String transactionId = params.getOrDefault("vnp_TransactionNo", params.get("vnp_BankTranNo"));
        if (!StringUtils.hasText(orderId)) {
            return Optional.empty();
        }
        return Optional.of(new PaymentNotifyResult(orderId, StringUtils.hasText(transactionId) ? transactionId : orderId));
    }

    @Override
    public Optional<PaymentNotifyResult> queryPaid(String orderId, String clientIp) {
        if (mockPaymentEnabled || !StringUtils.hasText(vnpayProperties.getTmnCode())) {
            return Optional.empty();
        }
        try {
            String resolvedIp = StringUtils.hasText(clientIp) ? clientIp.trim() : "127.0.0.1";
            Map<String, String> params = new HashMap<>();
            params.put("vnp_RequestId", orderId + System.currentTimeMillis());
            params.put("vnp_Version", "2.1.0");
            params.put("vnp_Command", "querydr");
            params.put("vnp_TmnCode", vnpayProperties.getTmnCode());
            params.put("vnp_TxnRef", orderId);
            params.put("vnp_OrderInfo", "query");
            params.put("vnp_TransactionDate", LocalDateTime.now().format(VNPAY_DATE));
            params.put("vnp_CreateDate", LocalDateTime.now().format(VNPAY_DATE));
            params.put("vnp_IpAddr", resolvedIp);
            String query = VNPaySignatureUtil.buildSignedQuery(params, vnpayProperties.getHashSecret());
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(vnpayProperties.getQueryUrl()))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(query))
                    .build();
            HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
            String body = response.body();
            if (body != null && body.contains("vnp_ResponseCode=00")) {
                return Optional.of(new PaymentNotifyResult(orderId, orderId));
            }
        } catch (Exception ex) {
            log.warn("VNPay query failed orderId={}", orderId, ex);
        }
        return Optional.empty();
    }

    @Override
    public Optional<PaymentRefundResult> refund(
            String orderId,
            String gatewayTransactionNo,
            String outRefundNo,
            BigDecimal amount,
            String clientIp
    ) {
        if (mockPaymentEnabled || !StringUtils.hasText(vnpayProperties.getTmnCode())) {
            return Optional.of(new PaymentRefundResult(outRefundNo, outRefundNo, true, "mock-refund"));
        }
        if (!StringUtils.hasText(gatewayTransactionNo)) {
            return Optional.empty();
        }
        try {
            assertConfigured();
            String resolvedIp = StringUtils.hasText(clientIp) ? clientIp.trim() : "127.0.0.1";
            long amountMinor = amount.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).longValue();
            Map<String, String> params = new HashMap<>();
            params.put("vnp_RequestId", outRefundNo);
            params.put("vnp_Version", "2.1.0");
            params.put("vnp_Command", "refund");
            params.put("vnp_TmnCode", vnpayProperties.getTmnCode());
            params.put("vnp_TransactionType", "02");
            params.put("vnp_TxnRef", orderId);
            params.put("vnp_Amount", String.valueOf(amountMinor));
            params.put("vnp_OrderInfo", "refund");
            params.put("vnp_TransactionNo", gatewayTransactionNo);
            params.put("vnp_TransactionDate", LocalDateTime.now().format(VNPAY_DATE));
            params.put("vnp_CreateDate", LocalDateTime.now().format(VNPAY_DATE));
            params.put("vnp_CreateBy", "system");
            params.put("vnp_IpAddr", resolvedIp);
            String query = VNPaySignatureUtil.buildSignedQuery(params, vnpayProperties.getHashSecret());
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(vnpayProperties.getRefundUrl()))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(query))
                    .build();
            HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
            String body = response.body() == null ? "" : response.body();
            boolean ok = body.contains("vnp_ResponseCode=00") || body.contains("\"vnp_ResponseCode\":\"00\"");
            return Optional.of(new PaymentRefundResult(outRefundNo, outRefundNo, ok, body));
        } catch (Exception ex) {
            log.warn("VNPay refund failed orderId={}", orderId, ex);
            return Optional.of(new PaymentRefundResult(outRefundNo, null, false, ex.getMessage()));
        }
    }

    private String appendOrderIdToReturnUrl(String orderId) {
        String base = vnpayProperties.getReturnUrl();
        if (!StringUtils.hasText(base)) {
            return "mysterybox://payment-return?orderId=" + orderId;
        }
        if (base.contains("orderId=")) {
            return base;
        }
        return base + (base.contains("?") ? "&" : "?") + "orderId=" + orderId;
    }

    private void assertConfigured() {
        if (mockPaymentEnabled) {
            return;
        }
        if (!StringUtils.hasText(vnpayProperties.getTmnCode()) || !StringUtils.hasText(vnpayProperties.getHashSecret())) {
            throw new BusinessException("VNPay chưa được cấu hình (tmn-code / hash-secret)");
        }
    }

    private String resolveUrl(String base, String path) {
        if (!StringUtils.hasText(base)) {
            return path == null ? "" : path;
        }
        if (!StringUtils.hasText(path) || base.endsWith(path)) {
            return base;
        }
        if (base.endsWith("/")) {
            return base + path.replaceFirst("^/", "");
        }
        return base + (path.startsWith("/") ? path : "/" + path);
    }
}
