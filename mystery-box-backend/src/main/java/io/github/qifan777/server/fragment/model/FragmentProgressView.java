package io.github.qifan777.server.fragment.model;

import java.util.List;

public record FragmentProgressView(
        int balance,
        int totalSkus,
        int affordableCount,
        List<SkuProgress> skus
) {
    public record SkuProgress(
            String id,
            String name,
            String cover,
            int fragmentCost,
            int stockRemaining,
            boolean affordable,
            double progressPercent
    ) {
    }
}
