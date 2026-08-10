package io.github.qifan777.server.referral.model;

import java.util.List;

public record ReferralMilestonesView(
        int invitedCount,
        List<MilestoneTier> tiers
) {
    public record MilestoneTier(
            int targetCount,
            String label,
            boolean reached,
            int rewardCoins,
            boolean claimed
    ) {
    }
}
