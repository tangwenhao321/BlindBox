package io.github.qifan777.server.payment.gateway;

import java.math.BigDecimal;

public record VNPayPrepayView(
        String orderId,
        BigDecimal payAmount,
        String paymentUrl,
        String returnUrl,
        boolean sandbox
) {
}
