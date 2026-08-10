package io.github.qifan777.server.payment.gateway;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.binarywang.wxpay.bean.result.WxPayUnifiedOrderV3Result;
import io.github.qifan777.server.dict.model.DictConstants.PayType;
import io.github.qifan777.server.order.entity.BaseOrder;
import io.github.qifan777.server.payment.model.WeChatPayModel;
import io.github.qifan777.server.payment.service.WeChatPayService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class WeChatPaymentGateway implements PaymentGateway {
    private final WeChatPayService weChatPayService;

    @Override
    public PayType payType() {
        return PayType.WE_CHAT_PAY;
    }

    @Override
    public Object prepay(BaseOrder baseOrder, int expiredMinutes, String notifyPath, String clientIp) {
        return weChatPayService.prepay(new WeChatPayModel()
                .setBaseOrder(baseOrder)
                .setExpiredMinutes(expiredMinutes)
                .setNotifyUrl(notifyPath));
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
