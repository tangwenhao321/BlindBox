package io.github.qifan777.server.user.notification;

import io.github.qifan777.server.user.notification.dto.NotificationPrefView;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserNotificationPrefService {
    private final JdbcTemplate jdbcTemplate;

    public NotificationPrefView get(String userId) {
        return find(userId).orElseGet(UserNotificationPrefService::defaults);
    }

    public NotificationPrefView update(String userId, NotificationPrefView pref) {
        NotificationPrefView normalized = pref == null ? defaults() : pref;
        jdbcTemplate.update(
                """
                        INSERT INTO user_notification_pref (
                            user_id, order_enabled, refund_enabled, warehouse_ship_enabled,
                            marketplace_enabled, marketing_enabled, updated_time
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                          order_enabled = VALUES(order_enabled),
                          refund_enabled = VALUES(refund_enabled),
                          warehouse_ship_enabled = VALUES(warehouse_ship_enabled),
                          marketplace_enabled = VALUES(marketplace_enabled),
                          marketing_enabled = VALUES(marketing_enabled),
                          updated_time = VALUES(updated_time)
                        """,
                userId,
                normalized.orderEnabled() ? 1 : 0,
                normalized.refundEnabled() ? 1 : 0,
                normalized.warehouseShipEnabled() ? 1 : 0,
                normalized.marketplaceEnabled() ? 1 : 0,
                normalized.marketingEnabled() ? 1 : 0,
                LocalDateTime.now());
        return normalized;
    }

    public Optional<NotificationPrefView> find(String userId) {
        return jdbcTemplate.query(
                        """
                                SELECT order_enabled, refund_enabled, warehouse_ship_enabled,
                                       marketplace_enabled, marketing_enabled
                                FROM user_notification_pref
                                WHERE user_id = ?
                                """,
                        (rs, rowNum) -> new NotificationPrefView(
                                rs.getInt("order_enabled") == 1,
                                rs.getInt("refund_enabled") == 1,
                                rs.getInt("warehouse_ship_enabled") == 1,
                                rs.getInt("marketplace_enabled") == 1,
                                rs.getInt("marketing_enabled") == 1),
                        userId)
                .stream()
                .findFirst();
    }

    /**
     * Preferences for a batch of users in one round-trip. Users with no stored row are absent from the
     * map; callers should fall back to {@link #defaults()}.
     */
    public Map<String, NotificationPrefView> findAll(Collection<String> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }
        List<String> ids = userIds.stream().filter(id -> id != null && !id.isBlank()).distinct().toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        String placeholders = String.join(",", ids.stream().map(id -> "?").toList());
        Map<String, NotificationPrefView> result = new HashMap<>();
        jdbcTemplate.query(
                """
                        SELECT user_id, order_enabled, refund_enabled, warehouse_ship_enabled,
                               marketplace_enabled, marketing_enabled
                        FROM user_notification_pref
                        WHERE user_id IN (%s)
                        """.formatted(placeholders),
                rs -> {
                    result.put(rs.getString("user_id"), new NotificationPrefView(
                            rs.getInt("order_enabled") == 1,
                            rs.getInt("refund_enabled") == 1,
                            rs.getInt("warehouse_ship_enabled") == 1,
                            rs.getInt("marketplace_enabled") == 1,
                            rs.getInt("marketing_enabled") == 1));
                },
                ids.toArray()
        );
        return result;
    }

    public static NotificationPrefView defaults() {
        return new NotificationPrefView(true, true, true, true, true);
    }
}
