package io.github.qifan777.server.box.draw;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Adjusts base box rates (base 10000) for newbie / lose-streak / multi-draw / VN time-of-day
 * effects, then caps the hidden share and renormalizes so the three rates still sum to 10000.
 *
 * <p>Positive boosts are capped ({@code app.draw.dynamic-boost-cap-percent}, default 25% of base
 * hidden) so stacked marketing knobs cannot erase house edge. Newbie boost is suppressed when
 * the order already uses newcomer first-draw pricing.
 *
 * <p>All math stays in integers to avoid floating drift that would break fairness audits.
 */
@Component
public class DynamicProbabilityAdjuster {
    public static final int PROBABILITY_BASE = 10000;
    /** Lose streak reaches full +50% boost at this many draws without a high tier. */
    public static final int STREAK_FULL_DRAWS = 50;
    /** Cap: effective hidden / sum must not exceed 85%. */
    private static final int HIDDEN_SHARE_CAP_NUM = 85;
    private static final int HIDDEN_SHARE_CAP_DEN = 100;

    /** Max positive hidden boost as percent of base hidden (stacked effects). */
    @Value("${app.draw.dynamic-boost-cap-percent:25}")
    private int dynamicBoostCapPercent = 25;

    public record AdjustContext(
            int userDrawCountOnBox,
            int loseStreak,
            int drawCountInOrder,
            int hourOfDay,
            boolean suppressNewbieBoost
    ) {
        public AdjustContext(int userDrawCountOnBox, int loseStreak, int drawCountInOrder, int hourOfDay) {
            this(userDrawCountOnBox, loseStreak, drawCountInOrder, hourOfDay, false);
        }
    }

    public record AdjustedRates(int legendaryRate, int hiddenRate, int generalRate) {
        public int sum() {
            return legendaryRate + hiddenRate + generalRate;
        }
    }

    public AdjustedRates adjust(int baseLegendary, int baseHidden, int baseGeneral, AdjustContext ctx) {
        if (baseLegendary + baseHidden + baseGeneral != PROBABILITY_BASE) {
            return new AdjustedRates(baseLegendary, baseHidden, baseGeneral);
        }
        if (ctx == null) {
            return new AdjustedRates(baseLegendary, baseHidden, baseGeneral);
        }

        long hiddenDelta = 0L;

        // Newbie: first 3 draws on this box → hidden +30% of base hidden (skipped on 0.01 newcomer price)
        if (!ctx.suppressNewbieBoost() && ctx.userDrawCountOnBox() < 3) {
            hiddenDelta += baseHidden * 30L / 100L;
        }

        // Lose streak: linear boost up to +50% of base hidden
        int streakPct = Math.min(Math.max(ctx.loseStreak(), 0), STREAK_FULL_DRAWS) * 50 / STREAK_FULL_DRAWS;
        hiddenDelta += baseHidden * (long) streakPct / 100L;

        // Multi-draw: count >= 3 → hidden +10% of base
        if (ctx.drawCountInOrder() >= 3) {
            hiddenDelta += baseHidden * 10L / 100L;
        }

        // VN peak 20:00-22:00 → -5%; otherwise +5%
        int hour = ctx.hourOfDay();
        if (hour >= 20 && hour < 22) {
            hiddenDelta -= baseHidden * 5L / 100L;
        } else {
            hiddenDelta += baseHidden * 5L / 100L;
        }

        // Cap stacked positive boosts so house edge cannot be erased by marketing knobs.
        int capPct = Math.max(0, Math.min(dynamicBoostCapPercent, 100));
        long maxPositive = baseHidden * (long) capPct / 100L;
        if (hiddenDelta > maxPositive) {
            hiddenDelta = maxPositive;
        }

        long adjHidden = Math.max(0L, baseHidden + hiddenDelta);
        long adjLegendary = baseLegendary;
        long adjGeneral = baseGeneral - hiddenDelta;

        if (adjGeneral < 0) {
            adjLegendary += adjGeneral;
            adjGeneral = 0;
            if (adjLegendary < 0) {
                adjHidden = Math.min(PROBABILITY_BASE, adjHidden - adjLegendary);
                adjLegendary = 0;
            }
        }

        return capAndRenormalize((int) adjLegendary, (int) adjHidden, (int) adjGeneral);
    }

    AdjustedRates capAndRenormalize(int legendary, int hidden, int general) {
        long l = Math.max(0, legendary);
        long h = Math.max(0, hidden);
        long g = Math.max(0, general);
        long sum = l + h + g;
        if (sum <= 0) {
            return new AdjustedRates(0, 0, PROBABILITY_BASE);
        }

        // Cap hidden share: h / sum <= 0.85
        long maxHidden = sum * HIDDEN_SHARE_CAP_NUM / HIDDEN_SHARE_CAP_DEN;
        if (h > maxHidden) {
            long overflow = h - maxHidden;
            h = maxHidden;
            // Prefer restoring general, then legendary
            g += overflow;
        }

        sum = l + h + g;
        if (sum == PROBABILITY_BASE) {
            return new AdjustedRates((int) l, (int) h, (int) g);
        }

        // Renormalize to base 10000 with largest-remainder so integers still sum exactly.
        long scale = PROBABILITY_BASE;
        long rawL = l * scale;
        long rawH = h * scale;
        long rawG = g * scale;
        int outL = (int) (rawL / sum);
        int outH = (int) (rawH / sum);
        int outG = (int) (rawG / sum);
        int assigned = outL + outH + outG;
        int remain = PROBABILITY_BASE - assigned;
        // Distribute leftover 1s by fractional remainder size
        long fracL = rawL % sum;
        long fracH = rawH % sum;
        long fracG = rawG % sum;
        while (remain > 0) {
            if (fracL >= fracH && fracL >= fracG) {
                outL++;
                fracL = -1;
            } else if (fracH >= fracG) {
                outH++;
                fracH = -1;
            } else {
                outG++;
                fracG = -1;
            }
            remain--;
        }
        return new AdjustedRates(outL, outH, outG);
    }
}
