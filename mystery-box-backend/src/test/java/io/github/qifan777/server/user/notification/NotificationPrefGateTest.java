package io.github.qifan777.server.user.notification;

import io.github.qifan777.server.user.notification.dto.NotificationPrefView;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NotificationPrefGateTest {

    private static final NotificationPrefView ALL_ON =
            new NotificationPrefView(true, true, true, true, true);
    private static final NotificationPrefView ALL_OFF =
            new NotificationPrefView(false, false, false, false, false);

    @Test
    void orderCategoryUsesOrderEnabled() {
        assertTrue(NotificationPrefGate.allowsPush(ALL_ON, "ORDER"));
        assertTrue(NotificationPrefGate.allowsPush(ALL_ON, "PENDING_PAY"));
        assertTrue(NotificationPrefGate.allowsPush(ALL_ON, "QUEUE"));
        assertFalse(NotificationPrefGate.allowsPush(ALL_OFF, "QUEUE"));
    }

    @Test
    void marketingCategoryUsesMarketingEnabled() {
        assertTrue(NotificationPrefGate.allowsPush(ALL_ON, "OPS_MESSAGE"));
        assertFalse(NotificationPrefGate.allowsPush(ALL_OFF, "NEWCOMER_RECALL"));
    }

    @Test
    void unknownCategoryDefaultsToAllow() {
        assertTrue(NotificationPrefGate.allowsPush(ALL_OFF, "SYSTEM"));
    }
}
