package io.github.qifan777.server.payment.gateway;

import io.github.qifan777.server.dict.model.DictConstants.PayType;
import io.github.qifan777.server.order.entity.BaseOrder;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

public interface PaymentGateway {
    PayType payType();

    /** Provider-specific prepay payload for the mobile client. */
    default Object prepay(BaseOrder baseOrder, int expiredMinutes, String notifyPath) {
        return prepay(baseOrder, expiredMinutes, notifyPath, "127.0.0.1");
    }

    Object prepay(BaseOrder baseOrder, int expiredMinutes, String notifyPath, String clientIp);

    /** Parse IPN/notify body and return order id + gateway transaction id when paid. */
    Optional<PaymentNotifyResult> parsePaymentNotify(String body, Map<String, String> params);

    /** Query gateway for payment status; empty if unknown or unpaid. */
    default Optional<PaymentNotifyResult> queryPaid(String orderId) {
        return queryPaid(orderId, "127.0.0.1");
    }

    Optional<PaymentNotifyResult> queryPaid(String orderId, String clientIp);

    /** Initiate refund at payment gateway; empty when unsupported. */
    default Optional<PaymentRefundResult> refund(
            String orderId,
            String gatewayTransactionNo,
            String outRefundNo,
            BigDecimal amount,
            String clientIp
    ) {
        return Optional.empty();
    }
}
