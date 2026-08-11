package io.github.qifan777.server.box.root.model;

import java.time.LocalDateTime;

/**
 * Box probability disclosure. Base rates are always present; when the caller is logged in,
 * {@code effective*} rates reflect {@link io.github.qifan777.server.box.draw.DynamicProbabilityAdjuster}
 * for the current user / draw count / VN hour.
 */
public record MysteryBoxProbabilityView(
        int legendaryRate,
        int hiddenRate,
        int generalRate,
        LocalDateTime updatedAt,
        boolean dynamicProbability,
        Integer effectiveLegendaryRate,
        Integer effectiveHiddenRate,
        Integer effectiveGeneralRate
) {
    public static MysteryBoxProbabilityView ofBase(
            int legendaryRate,
            int hiddenRate,
            int generalRate,
            LocalDateTime updatedAt
    ) {
        return new MysteryBoxProbabilityView(
                legendaryRate,
                hiddenRate,
                generalRate,
                updatedAt,
                true,
                null,
                null,
                null
        );
    }

    public static MysteryBoxProbabilityView ofEffective(
            int legendaryRate,
            int hiddenRate,
            int generalRate,
            LocalDateTime updatedAt,
            int effectiveLegendary,
            int effectiveHidden,
            int effectiveGeneral
    ) {
        return new MysteryBoxProbabilityView(
                legendaryRate,
                hiddenRate,
                generalRate,
                updatedAt,
                true,
                effectiveLegendary,
                effectiveHidden,
                effectiveGeneral
        );
    }
}
