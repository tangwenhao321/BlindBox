package io.github.qifan777.server.box.order;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OrderIdsTest {

    @Test
    void detectsSnowflakeIds() {
        assertTrue(OrderIds.isSnowflake("890123456789012345"));
        assertFalse(OrderIds.isSnowflake("ORD-2026-00123"));
    }

    @Test
    void detectsLegacyUuidIds() {
        assertTrue(OrderIds.isLegacyUuid("a1b2c3d4e5f6789012345678901234ab"));
        assertFalse(OrderIds.isLegacyUuid("890123456789012345"));
    }

    @Test
    void formatKind_classifiesIds() {
        assertEquals("SNOWFLAKE", OrderIds.formatKind("890123456789012345"));
        assertEquals("LEGACY_UUID", OrderIds.formatKind("a1b2c3d4e5f6789012345678901234ab"));
        assertEquals("OTHER", OrderIds.formatKind("ORD-2026-00123"));
    }

    @Test
    void next_generatesSnowflakeNumericId() {
        String id = OrderIds.next();
        assertTrue(OrderIds.isSnowflake(id));
    }
}
