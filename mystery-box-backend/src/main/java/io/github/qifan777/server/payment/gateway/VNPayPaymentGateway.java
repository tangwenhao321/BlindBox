package io.github.qifan777.server.payment.gateway;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.qifan777.server.dict.model.DictConstants.PayType;
import io.github.qifan777.server.infrastructure.money.MoneyRounding;
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
import java.net.URI;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
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
    /** Keep create-date beyond typical unpaid cancel window so refund/querydr still work. */
    private static final long CREATE_DATE_TTL_DAYS = 14;

    private final VNPayProperties vnpayProperties;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${payment.mock-enabled:false}")
    private boolean mockPaymentEnabled;

    @Override
    public PayType payType() {
        return PayType.VN_PAY;
    }

    public static String prepayCacheKey(String orderId) {
        return "prepay:vnpay:" + orderId;
    }

    public static String createDateCacheKey(String orderId) {
        return "prepay:vnpay:createdate:" + orderId;
    }

    /** Drop cached pay URL after payAmount / retention mutation so IPN amount stays consistent. */
    public void invalidatePrepayCache(String orderId) {
        if (!StringUtils.hasText(orderId)) {
            return;
        }
        try {
            redisTemplate.delete(prepayCacheKey(orderId));
        } catch (Exception ex) {
            log.warn("Failed to invalidate VNPay prepay cache orderId={}", orderId, ex);
        }
    }

    @Override
    public VNPayPrepayView prepay(BaseOrder baseOrder, int expiredMinutes, String notifyPath, String clientIp) {
        String cacheKey = prepayCacheKey(baseOrder.id());
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
        long amountMinor = MoneyRounding.toGatewayMinorUnits(payAmount);
        String createDate = LocalDateTime.now().format(VNPAY_DATE);
        String expireDate = LocalDateTime.now().plusMinutes(expiredMinutes).format(VNPAY_DATE);
        rememberCreateDate(baseOrder.id(), createDate);
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
        String txnStatus = params.get("vnp_TransactionStatus");
        if (StringUtils.hasText(txnStatus) && !"00".equals(txnStatus)) {
            log.info("VNPay IPN non-success transactionStatus={} order={}", txnStatus, params.get("vnp_TxnRef"));
            return Optional.empty();
        }
        String orderId = params.get("vnp_TxnRef");
        String transactionId = params.getOrDefault("vnp_TransactionNo", params.get("vnp_BankTranNo"));
        if (!StringUtils.hasText(orderId)) {
            return Optional.empty();
        }
        Long amountMinor = parseAmountMinor(params.get("vnp_Amount"), orderId);
        if (amountMinor == null) {
            return Optional.empty();
        }
        // Prefer gateway pay date for later querydr/refund.
        String payDate = firstNonBlank(params.get("vnp_PayDate"), params.get("vnp_CreateDate"));
        if (StringUtils.hasText(payDate)) {
            rememberCreateDate(orderId, payDate.trim());
        }
        return Optional.of(new PaymentNotifyResult(
                orderId,
                StringUtils.hasText(transactionId) ? transactionId : orderId,
                amountMinor
        ));
    }

    /**
     * VNPay {@code vnp_Amount} is VND * 100 (same scale as prepay).
     */
    public boolean matchesPayAmount(Long amountMinor, BigDecimal payAmount) {
        if (amountMinor == null || payAmount == null) {
            return false;
        }
        return MoneyRounding.matchesGatewayMinor(amountMinor, payAmount);
    }

    private Long parseAmountMinor(String amountStr, String orderId) {
        if (!StringUtils.hasText(amountStr)) {
            log.warn("VNPay amount missing order={}", orderId);
            return null;
        }
        try {
            return Long.parseLong(amountStr.trim());
        } catch (NumberFormatException ex) {
            log.warn("VNPay invalid amount={} order={}", amountStr, orderId);
            return null;
        }
    }

    @Override
    public Optional<PaymentNotifyResult> queryPaid(String orderId, String clientIp) {
        return queryPaid(orderId, clientIp, null);
    }

    /**
     * @param preferredTxnTime original payment/create time when known (order.createdTime / payment.payTime)
     */
    public Optional<PaymentNotifyResult> queryPaid(String orderId, String clientIp, LocalDateTime preferredTxnTime) {
        if (mockPaymentEnabled || !StringUtils.hasText(vnpayProperties.getTmnCode())) {
            return Optional.empty();
        }
        try {
            String resolvedIp = StringUtils.hasText(clientIp) ? clientIp.trim() : "127.0.0.1";
            String txnDate = resolveTransactionDate(orderId, preferredTxnTime);
            Map<String, String> params = new HashMap<>();
            params.put("vnp_RequestId", orderId + System.currentTimeMillis());
            params.put("vnp_Version", "2.1.0");
            params.put("vnp_Command", "querydr");
            params.put("vnp_TmnCode", vnpayProperties.getTmnCode());
            params.put("vnp_TxnRef", orderId);
            params.put("vnp_OrderInfo", "query");
            params.put("vnp_TransactionDate", txnDate);
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
            Map<String, String> parsed = parseFormOrQueryBody(body);
            String responseCode = firstNonBlank(parsed.get("vnp_ResponseCode"), extractField(body, "vnp_ResponseCode"));
            if (!"00".equals(responseCode)) {
                return Optional.empty();
            }
            Long amountMinor = parseAmountMinor(
                    firstNonBlank(parsed.get("vnp_Amount"), extractField(body, "vnp_Amount")),
                    orderId
            );
            if (amountMinor == null) {
                log.warn("VNPay querydr success without amount orderId={}", orderId);
                return Optional.empty();
            }
            String transactionId = firstNonBlank(
                    parsed.get("vnp_TransactionNo"),
                    extractField(body, "vnp_TransactionNo"),
                    orderId
            );
            return Optional.of(new PaymentNotifyResult(orderId, transactionId, amountMinor));
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
        return refund(orderId, gatewayTransactionNo, outRefundNo, amount, clientIp, null);
    }

    public Optional<PaymentRefundResult> refund(
            String orderId,
            String gatewayTransactionNo,
            String outRefundNo,
            BigDecimal amount,
            String clientIp,
            LocalDateTime preferredTxnTime
    ) {
        if (mockPaymentEnabled) {
            return Optional.of(new PaymentRefundResult(outRefundNo, outRefundNo, true, "mock-refund"));
        }
        if (!StringUtils.hasText(vnpayProperties.getTmnCode())) {
            throw new BusinessException("VNPay chưa được cấu hình (tmn-code)");
        }
        if (!StringUtils.hasText(gatewayTransactionNo)) {
            return Optional.empty();
        }
        try {
            assertConfigured();
            String resolvedIp = StringUtils.hasText(clientIp) ? clientIp.trim() : "127.0.0.1";
            long amountMinor = MoneyRounding.toGatewayMinorUnits(amount);
            String txnDate = resolveTransactionDate(orderId, preferredTxnTime);
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
            params.put("vnp_TransactionDate", txnDate);
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

    public void rememberCreateDate(String orderId, String createDateYyyyMMddHHmmss) {
        if (!StringUtils.hasText(orderId) || !StringUtils.hasText(createDateYyyyMMddHHmmss)) {
            return;
        }
        try {
            redisTemplate.opsForValue().set(
                    createDateCacheKey(orderId),
                    createDateYyyyMMddHHmmss.trim(),
                    CREATE_DATE_TTL_DAYS,
                    TimeUnit.DAYS
            );
        } catch (Exception ex) {
            log.warn("Failed to cache VNPay createDate orderId={}", orderId, ex);
        }
    }

    private String resolveTransactionDate(String orderId, LocalDateTime preferredTxnTime) {
        try {
            String cached = redisTemplate.opsForValue().get(createDateCacheKey(orderId));
            if (StringUtils.hasText(cached) && cached.trim().matches("\\d{14}")) {
                return cached.trim();
            }
        } catch (Exception ex) {
            log.debug("VNPay createDate cache miss orderId={}: {}", orderId, ex.getMessage());
        }
        LocalDateTime when = preferredTxnTime != null ? preferredTxnTime : LocalDateTime.now();
        return when.format(VNPAY_DATE);
    }

    private Map<String, String> parseFormOrQueryBody(String body) {
        Map<String, String> out = new HashMap<>();
        if (!StringUtils.hasText(body)) {
            return out;
        }
        String trimmed = body.trim();
        if (trimmed.startsWith("{")) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> json = objectMapper.readValue(trimmed, Map.class);
                for (Map.Entry<String, Object> e : json.entrySet()) {
                    if (e.getKey() != null && e.getValue() != null) {
                        out.put(e.getKey(), String.valueOf(e.getValue()));
                    }
                }
            } catch (Exception ex) {
                log.debug("VNPay query body JSON parse fallback: {}", ex.getMessage());
            }
            return out;
        }
        for (String part : trimmed.split("&")) {
            int eq = part.indexOf('=');
            if (eq <= 0) {
                continue;
            }
            String key = URLDecoder.decode(part.substring(0, eq), StandardCharsets.UTF_8);
            String value = URLDecoder.decode(part.substring(eq + 1), StandardCharsets.UTF_8);
            out.put(key, value);
        }
        return out;
    }

    private static String extractField(String body, String key) {
        if (!StringUtils.hasText(body) || !StringUtils.hasText(key)) {
            return null;
        }
        String marker = key + "=";
        int idx = body.indexOf(marker);
        if (idx < 0) {
            marker = "\"" + key + "\":\"";
            idx = body.indexOf(marker);
            if (idx < 0) {
                return null;
            }
            int start = idx + marker.length();
            int end = body.indexOf('"', start);
            return end > start ? body.substring(start, end) : null;
        }
        int start = idx + marker.length();
        int end = body.indexOf('&', start);
        String raw = end > start ? body.substring(start, end) : body.substring(start);
        return URLDecoder.decode(raw, StandardCharsets.UTF_8);
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return null;
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
