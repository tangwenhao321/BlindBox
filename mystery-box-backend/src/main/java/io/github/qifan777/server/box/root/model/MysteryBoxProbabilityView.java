package io.github.qifan777.server.box.root.model;

import java.time.LocalDateTime;

public record MysteryBoxProbabilityView(
        int legendaryRate,
        int hiddenRate,
        int generalRate,
        LocalDateTime updatedAt
) {
}
