package io.github.qifan777.server.payment.gateway;

import io.github.qifan777.server.dict.model.DictConstants.PayType;
import io.github.qifan777.server.order.entity.BaseOrder;
import io.github.qifan777.server.payment.config.MoMoProperties;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;

/**
 * MoMo wallet stub — returns a deep link for mobile UI testing until Partner API is wired.
 */
@Component
@RequiredArgsConstructor
public class MoMoPaymentGateway implements PaymentGateway {
    private final MoMoProperties momoProperties;

    @Override
    public PayType payType() {
        return PayType.MO_MO;
    }

    @Override
    public MoMoPrepayView prepay(BaseOrder baseOrder, int expiredMinutes, String notifyPath, String clientIp) {
        if (!momoProperties.isEnabled()) {
            throw new BusinessException("MoMo 支付尚未开通");
        }
        if (!momoProperties.isConfigured()) {
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
        return Optional.empty();
    }

    @Override
    public Optional<PaymentNotifyResult> queryPaid(String orderId, String clientIp) {
        return Optional.empty();
    }
}
