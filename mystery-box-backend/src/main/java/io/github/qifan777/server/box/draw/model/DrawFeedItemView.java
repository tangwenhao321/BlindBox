package io.github.qifan777.server.box.draw.model;

import java.time.LocalDateTime;

public record DrawFeedItemView(
        String id,
        String displayName,
        String productName,
        String qualityType,
        boolean lastOne,
        LocalDateTime createdTime
) {
}
