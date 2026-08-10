package io.github.qifan777.server.referral.model;

import java.math.BigDecimal;

public record ReferralStatsView(
        String inviteCode,
        int invitedCount,
        int level2Count,
        BigDecimal totalCommission,
        int luckyCoins,
        int starStones
) {
}
