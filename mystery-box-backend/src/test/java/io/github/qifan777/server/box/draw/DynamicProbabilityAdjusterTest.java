package io.github.qifan777.server.box.draw;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DynamicProbabilityAdjusterTest {

    private DynamicProbabilityAdjuster adjuster;

    @BeforeEach
    void setUp() {
        adjuster = new DynamicProbabilityAdjuster();
        ReflectionTestUtils.setField(adjuster, "dynamicBoostCapPercent", 25);
    }

    @Test
    void baseRatesUnchangedWhenContextNull() {
        var rates = adjuster.adjust(500, 1500, 8000, null);
        assertEquals(500, rates.legendaryRate());
        assertEquals(1500, rates.hiddenRate());
        assertEquals(8000, rates.generalRate());
        assertEquals(10000, rates.sum());
    }

    @Test
    void newbiePlusOffPeakCappedAtTwentyFivePercent() {
        // raw +35% would be 1350; cap 25% → 1250
        var ctx = new DynamicProbabilityAdjuster.AdjustContext(0, 0, 1, 10);
        var rates = adjuster.adjust(500, 1000, 8500, ctx);
        assertEquals(10000, rates.sum());
        assertEquals(1250, rates.hiddenRate());
        assertEquals(500, rates.legendaryRate());
        assertEquals(8250, rates.generalRate());
    }

    @Test
    void suppressNewbieRemovesNewbieBoost() {
        // only off-peak +5% under cap
        var ctx = new DynamicProbabilityAdjuster.AdjustContext(0, 0, 1, 10, true);
        var rates = adjuster.adjust(500, 1000, 8500, ctx);
        assertEquals(10000, rates.sum());
        assertEquals(1050, rates.hiddenRate());
    }

    @Test
    void loseStreakCappedAtTwentyFivePercent() {
        // raw +55% → capped +25%
        var ctx = new DynamicProbabilityAdjuster.AdjustContext(10, 50, 1, 12);
        var rates = adjuster.adjust(500, 1000, 8500, ctx);
        assertEquals(10000, rates.sum());
        assertEquals(1250, rates.hiddenRate());
    }

    @Test
    void multiDrawAddsTenPercentUnderCap() {
        // multi (+10%) + off-peak (+5%) = +15%
        var ctx = new DynamicProbabilityAdjuster.AdjustContext(5, 0, 3, 12);
        var rates = adjuster.adjust(500, 1000, 8500, ctx);
        assertEquals(10000, rates.sum());
        assertEquals(1150, rates.hiddenRate());
    }

    @Test
    void peakHoursReduceHidden() {
        var ctx = new DynamicProbabilityAdjuster.AdjustContext(5, 0, 1, 20);
        var rates = adjuster.adjust(500, 1000, 8500, ctx);
        assertEquals(10000, rates.sum());
        assertEquals(950, rates.hiddenRate());
    }

    @Test
    void hiddenShareCappedAtEightyFivePercent() {
        var ctx = new DynamicProbabilityAdjuster.AdjustContext(0, 50, 5, 10);
        var rates = adjuster.adjust(100, 7000, 2900, ctx);
        assertEquals(10000, rates.sum());
        assertTrue(rates.hiddenRate() * 100L <= rates.sum() * 85L);
        assertTrue(rates.hiddenRate() <= 8500);
    }

    @Test
    void alwaysSumsToBase() {
        int[] hours = {0, 10, 20, 21, 23};
        for (int hour : hours) {
            for (int streak = 0; streak <= 50; streak += 10) {
                var ctx = new DynamicProbabilityAdjuster.AdjustContext(streak % 5, streak, 1 + streak % 4, hour);
                var rates = adjuster.adjust(300, 1200, 8500, ctx);
                assertEquals(10000, rates.sum(), "hour=" + hour + " streak=" + streak);
            }
        }
    }

    @Test
    void invalidBaseSumPassesThrough() {
        var rates = adjuster.adjust(1, 1, 1, new DynamicProbabilityAdjuster.AdjustContext(0, 0, 1, 10));
        assertEquals(1, rates.legendaryRate());
        assertEquals(1, rates.hiddenRate());
        assertEquals(1, rates.generalRate());
    }
}
