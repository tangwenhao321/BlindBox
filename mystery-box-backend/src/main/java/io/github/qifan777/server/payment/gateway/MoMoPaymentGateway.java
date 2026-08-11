package io.github.qifan777.server.payment.gateway;

import io.github.qifan777.server.dict.model.DictConstants.PayType;
import io.github.qifan777.server.order.entity.BaseOrder;
import io.github.qifan777.server.payment.config.MoMoProperties;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import io.github.qifan777.server.infrastructure.money.MoneyRounding;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

/**
 * MoMo wallet — stub deep-link for UI testing. Live Partner IPN must verify HMAC before enable.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MoMoPaymentGateway implements PaymentGateway {
    private final MoMoProperties momoProperties;

    @Override
    public PayType payType() {
        return PayType.MO_MO;
    }

    public boolean isStub() {
        return momoProperties.isStub();
    }

    /** Reserved for Partner prepay session cache once createOrder is wired. */
    public void invalidatePrepayCache(String orderId) {
        // No Redis prepay cache while stub; keep method so retention can clear all channels uniformly.
    }

    @Override
    public MoMoPrepayView prepay(BaseOrder baseOrder, int expiredMinutes, String notifyPath, String clientIp) {
        if (!momoProperties.isCheckoutOffered()) {
            if (momoProperties.isStub()) {
                throw new BusinessException("MoMo 支付仍为 stub，生产环境未开通");
            }
            if (!momoProperties.isEnabled()) {
                throw new BusinessException("MoMo 支付尚未开通");
            }
            throw new BusinessException("MoMo 凭证未配置（momo.partner-code / access-key / secret-key）");
        }
        String deeplink = momoProperties.getReturnUrl()
                + (momoProperties.getReturnUrl().contains("?") ? "&" : "?")
                + "orderId=" + baseOrder.id()
                + "&provider=momo&stub=1";
        return new MoMoPrepayView(baseOrder.id(), deeplink, true);
    }

    @Override
    public Optional<PaymentNotifyResult> parsePaymentNotify(String body, Map<String, String> params) {
        if (params == null || params.isEmpty()) {
            return Optional.empty();
        }
        // Never accept unsigned / stub IPN as paid — forgeable via public notify URL.
        // Live HMAC verification must be wired before any notify is accepted.
        if (isStub() || !momoProperties.isEnabled() || !momoProperties.isConfigured()
                || !momoProperties.isPartnerWired()) {
            log.warn("MoMo notify rejected: stub/disabled/unconfigured/unwired (fail-closed)");
            return Optional.empty();
        }
        log.warn("MoMo notify rejected: live Partner signature verification not implemented");
        return Optional.empty();
    }

    /**
     * MoMo Partner {@code amount} is integer VND (major units), not VNPay's VND×100.
     * {@code partnerAmountVnd} is the Partner notify/query amount field.
     */
    public boolean matchesPayAmount(Long partnerAmountVnd, BigDecimal payAmount) {
        if (partnerAmountVnd == null || payAmount == null) {
            return false;
        }
        BigDecimal rounded = MoneyRounding.round(payAmount, "VND");
        return rounded != null && partnerAmountVnd == rounded.longValue();
    }

    @Override
    public Optional<PaymentNotifyResult> queryPaid(String orderId, String clientIp) {
        return Optional.empty();
    }
}
