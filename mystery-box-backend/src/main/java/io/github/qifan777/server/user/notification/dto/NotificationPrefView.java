package io.github.qifan777.server.user.notification.dto;

public record NotificationPrefView(
        boolean orderEnabled,
        boolean refundEnabled,
        boolean warehouseShipEnabled,
        boolean marketplaceEnabled,
        boolean marketingEnabled
) {
}
