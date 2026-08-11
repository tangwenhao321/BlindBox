package io.github.qifan777.server.user.notification;

import io.github.qifan777.server.user.notification.dto.NotificationPrefView;

/**
 * Maps push notification categories to user preference toggles.
 */
public final class NotificationPrefGate {
    private NotificationPrefGate() {
    }

    public static boolean allowsPush(NotificationPrefView pref, String category) {
        if (pref == null) {
            return true;
        }
        String normalized = category == null ? "" : category.trim().toUpperCase();
        return switch (normalized) {
            case "ORDER", "PENDING_PAY", "QUEUE" -> pref.orderEnabled();
            case "REFUND" -> pref.refundEnabled();
            case "WAREHOUSE", "WAREHOUSE_SHIP" -> pref.warehouseShipEnabled();
            case "MARKETPLACE" -> pref.marketplaceEnabled();
            case "OPS_MESSAGE", "MARKETING", "NEWCOMER_RECALL" -> pref.marketingEnabled();
            // Running an outdated client can break against a newer API, so update notices are
            // delivered regardless of marketing preferences.
            case "APP_UPDATE" -> true;
            case "PITY", "PROBABILITY_CHANGE" -> true;
            // Restock alerts for users waiting on pity high-tier stock.
            case "RESTOCK" -> pref.orderEnabled();
            default -> true;
        };
    }
}
