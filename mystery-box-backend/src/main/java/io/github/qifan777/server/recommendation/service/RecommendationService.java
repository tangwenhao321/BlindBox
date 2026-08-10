package io.github.qifan777.server.recommendation.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class RecommendationService {
    private final JdbcTemplate jdbcTemplate;

    public List<String> recommendBoxIds(String userId, int limit) {
        return recommendBoxIds(userId, limit, variantForUser(userId));
    }

    public List<String> recommendBoxIds(String userId, int limit, String variant) {
        int size = Math.max(1, limit);
        List<String> byBehavior = List.of();
        try {
            if ("POPULAR".equalsIgnoreCase(variant)) {
                byBehavior = jdbcTemplate.query(
                        "SELECT CAST(JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.boxId')) AS CHAR) AS box_id, COUNT(1) AS score " +
                                "FROM analytics_event " +
                                "WHERE event_name IN ('home_box_click', 'box_create_order_click') " +
                                "AND JSON_EXTRACT(payload_json, '$.boxId') IS NOT NULL " +
                                "GROUP BY box_id ORDER BY score DESC LIMIT ?",
                        (rs, rowNum) -> rs.getString("box_id"),
                        size
                );
            } else {
                byBehavior = jdbcTemplate.query(
                        "SELECT CAST(JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.boxId')) AS CHAR) AS box_id, COUNT(1) AS score " +
                                "FROM analytics_event " +
                                "WHERE actor_id = ? AND event_name IN ('home_box_click', 'box_create_order_click') " +
                                "AND JSON_EXTRACT(payload_json, '$.boxId') IS NOT NULL " +
                                "GROUP BY box_id ORDER BY score DESC LIMIT ?",
                        (rs, rowNum) -> rs.getString("box_id"),
                        userId == null ? "" : userId,
                        size
                );
            }
        } catch (Exception ignored) {
            byBehavior = List.of();
        }
        if (!byBehavior.isEmpty()) {
            return byBehavior;
        }
        return jdbcTemplate.query(
                "SELECT id FROM mystery_box ORDER BY edited_time DESC LIMIT ?",
                (rs, rowNum) -> rs.getString("id"),
                size
        );
    }

    public Map<String, Object> debugFeatures(String userId) {
        String variant = variantForUser(userId);
        Integer clicks = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM analytics_event WHERE actor_id = ? AND event_name = 'home_box_click'",
                Integer.class,
                userId == null ? "" : userId
        );
        Integer createOrders = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM analytics_event WHERE actor_id = ? AND event_name = 'box_create_order_click'",
                Integer.class,
                userId == null ? "" : userId
        );
        return Map.of(
                "userId", userId == null ? "" : userId,
                "variant", variant,
                "clicks", clicks == null ? 0 : clicks,
                "createOrders", createOrders == null ? 0 : createOrders
        );
    }

    public String variantForUser(String userId) {
        int hash = Math.abs(Objects.toString(userId, "").hashCode());
        return (hash % 100) < 50 ? "PERSONALIZED" : "POPULAR";
    }
}
