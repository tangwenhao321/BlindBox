package io.github.qifan777.server.box.order.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record OrderPaymentMetaView(
        String orderId,
        LocalDateTime payDeadline,
        Integer stockLockedSeconds,
        boolean retentionClaimed,
        BigDecimal retentionDiscount,
        /** Whether the leave-with-offer CTA should be shown. */
        boolean retentionEligible,
        /** ALREADY_CLAIMED / DAILY_LIMIT / AMOUNT_TOO_LOW / DISABLED / null when eligible. */
        String retentionBlockReason,
        BigDecimal payAmount
) {
}
