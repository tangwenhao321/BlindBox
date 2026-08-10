package io.github.qifan777.server.home.model;

import java.util.List;

public record HomeSummaryView(
        long todayDrawCount,
        long todayLegendaryCount,
        List<HotBoxView> hotBoxes,
        List<String> recommendBoxIds,
        List<BannerView> banners
) {
    public record BannerView(
            String id,
            String picture,
            String content,
            String navigatorId,
            String navigatorType
    ) {
    }
    public record HotBoxView(
            String id,
            String name,
            String cover,
            int poolTotal,
            int poolRemaining,
            int drawCount7d
    ) {
    }
}
