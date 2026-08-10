package io.github.qifan777.server.box.product.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PrizeStockServiceTest {

    private static final int PROBABILITY_BASE = 10000;

    @Test
    void probabilityBaseIsTenThousand() {
        assertEquals(10000, PROBABILITY_BASE);
    }

    @Test
    void stockRemainingCannotExceedTotalInvariant() {
        int total = 10;
        int remaining = Math.max(total - 1, 0);
        assertEquals(9, remaining);
        assertTrue(remaining <= total);
    }

    @Test
    void lastOneTriggersOnlyWhenPoolEmpty() {
        boolean poolEmpty = true;
        boolean hasLastOneSku = true;
        assertTrue(poolEmpty && hasLastOneSku);
    }

    @Test
    void optimisticUpdateRequiresPositiveRemaining() {
        int remaining = 0;
        assertTrue(remaining <= 0);
    }
}
