package io.github.qifan777.server.box.root.model;

import java.util.List;

public record MysteryBoxInsightView(
        int poolTotal,
        int poolRemaining,
        Integer designatedBenefitRemaining,
        String designatedBenefitHint,
        List<PrizeStockLineView> prizeLines
) {
}
