package io.github.qifan777.server.box.root.model;

import java.time.LocalDateTime;
import java.util.List;

public record PoolDashboardView(
        int poolTotal,
        int poolRemaining,
        List<TierSummary> tiers,
        LastOneInfo lastOne,
        LocalDateTime updatedAt
) {
    public record TierSummary(String qualityType, int total, int remaining) {
    }

    public record LastOneInfo(String productId, String productName, boolean available) {
    }
}
