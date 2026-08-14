package io.github.qifan777.server.payment.gateway;

import io.github.qifan777.server.dict.model.PayType;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class PaymentGatewayRegistry {
    private final MarketProperties marketProperties;
    private final List<PaymentGateway> gateways;

    public PaymentGateway resolveForMarket() {
        return resolveByProvider(marketProperties.getPaymentProvider());
    }

    public PaymentGateway resolveByPayType(PayType payType) {
        return gateways.stream()
                .filter(g -> g.payType() == payType)
                .findFirst()
                .orElseThrow(() -> new BusinessException("Unsupported pay type: " + payType));
    }

    public PaymentGateway resolveByProvider(String provider) {
        String normalized = provider == null ? "wechat" : provider.trim().toLowerCase(Locale.ROOT);
        PayType payType = switch (normalized) {
            case "vnpay", "vn_pay" -> PayType.VN_PAY;
            case "momo", "mo_mo" -> PayType.MO_MO;
            case "wechat", "we_chat_pay" -> PayType.WE_CHAT_PAY;
            default -> throw new BusinessException("Unsupported payment provider: " + provider);
        };
        return resolveByPayType(payType);
    }

    public void assertMarketProvider(String requestedProvider) {
        if (!isAllowedProvider(requestedProvider)) {
            String market = normalizeProvider(marketProperties.getPaymentProvider(), "wechat");
            throw new BusinessException("当前市场仅支持 " + market + " 支付");
        }
    }

    /** VN market: VNPay primary + MoMo secondary wallet. */
    public void assertMarketOrSecondaryWallet(String requestedProvider) {
        assertMarketProvider(requestedProvider);
    }

    private boolean isAllowedProvider(String requestedProvider) {
        String market = normalizeProvider(marketProperties.getPaymentProvider(), "wechat");
        String requested = normalizeProvider(requestedProvider, "");
        if (market.equals(requested)) {
            return true;
        }
        return "vnpay".equals(market) && "momo".equals(requested);
    }

    private static String normalizeProvider(String provider, String fallback) {
        if (provider == null || provider.isBlank()) {
            return fallback;
        }
        return provider.trim().toLowerCase(Locale.ROOT);
    }

    public Map<PayType, PaymentGateway> asMap() {
        return gateways.stream().collect(Collectors.toMap(PaymentGateway::payType, Function.identity(), (a, b) -> a));
    }
}
