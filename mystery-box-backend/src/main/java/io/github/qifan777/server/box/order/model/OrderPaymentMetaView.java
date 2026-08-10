package io.github.qifan777.server.box.order.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record OrderPaymentMetaView(
        String orderId,
        LocalDateTime payDeadline,
        Integer stockLockedSeconds,
        boolean retentionClaimed,
        BigDecimal retentionDiscount
) {
}
