package io.github.qifan777.server.ops.service;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
@Slf4j
@RequiredArgsConstructor
public class AnalyticsEventService {
    private static final int MAX_BATCH_SIZE = 50;
    private static final int MAX_EVENT_NAME_LENGTH = 128;
    private static final int MAX_PAYLOAD_JSON_LENGTH = 8192;
    private static final int DEDUP_WINDOW_MINUTES = 30;
    private static final Set<String> DEDUP_WITHIN_WINDOW = Set.of(
            "app_open",
            "home_view",
            "mall_view",
            "warehouse_view",
            "profile_view",
            "box_detail_view"
    );

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    /**
     * Server-side analytics insert (order create attribution, payment reliability, etc.).
     * Best-effort: failures are logged and do not fail the business transaction.
     */
    public void recordServerEvent(String eventName, String actorId, Map<String, Object> payload) {
        if (eventName == null || eventName.isBlank()) {
            return;
        }
        String name = eventName.trim();
        if (name.length() > MAX_EVENT_NAME_LENGTH) {
            name = name.substring(0, MAX_EVENT_NAME_LENGTH);
        }
        try {
            String payloadJson = objectMapper.writeValueAsString(payload == null ? Map.of() : payload);
            if (payloadJson.length() > MAX_PAYLOAD_JSON_LENGTH) {
                log.warn("recordServerEvent skipped oversized payload: event={}, actorId={}", name, actorId);
                return;
            }
            jdbcTemplate.update(
                    "INSERT INTO analytics_event(event_name, actor_id, payload_json, event_at) VALUES (?, ?, ?, ?)",
                    name,
                    actorId == null ? "" : actorId,
                    payloadJson,
                    LocalDateTime.now()
            );
        } catch (Exception ex) {
            log.warn("recordServerEvent failed event={} actorId={}", name, actorId, ex);
        }
    }

    public int ingest(List<AnalyticsEventInput> payload, String actorId) {
        if (payload == null || payload.isEmpty()) {
            return 0;
        }
        List<AnalyticsEventInput> batch = payload.size() > MAX_BATCH_SIZE
                ? payload.subList(0, MAX_BATCH_SIZE)
                : payload;
        if (payload.size() > MAX_BATCH_SIZE) {
            log.warn("analytics ingest truncated: requested={}, acceptedBatch={}", payload.size(), MAX_BATCH_SIZE);
        }
        int accepted = 0;
        for (AnalyticsEventInput item : batch) {
            if (item == null || item.name() == null || item.name().isBlank()) {
                continue;
            }
            String eventName = item.name().trim();
            if (eventName.length() > MAX_EVENT_NAME_LENGTH) {
                eventName = eventName.substring(0, MAX_EVENT_NAME_LENGTH);
            }
            String payloadJson;
            try {
                payloadJson = objectMapper.writeValueAsString(item.payload() == null ? Map.of() : item.payload());
            } catch (Exception ignored) {
                continue;
            }
            if (payloadJson.length() > MAX_PAYLOAD_JSON_LENGTH) {
                log.warn("analytics ingest skipped oversized payload: event={}, actorId={}", eventName, actorId);
                continue;
            }
            String actorKey = actorId == null ? "" : actorId;
            if (DEDUP_WITHIN_WINDOW.contains(eventName) && recentlyIngested(eventName, actorKey)) {
                continue;
            }
            LocalDateTime eventAt = parseAt(item.at());
            try {
                jdbcTemplate.update(
                        "INSERT INTO analytics_event(event_name, actor_id, payload_json, event_at) VALUES (?, ?, ?, ?)",
                        eventName,
                        actorId == null ? "" : actorId,
                        payloadJson,
                        eventAt == null ? LocalDateTime.now() : eventAt
                );
                accepted += 1;
            } catch (Exception ignored) {
            }
        }
        log.info("analytics ingest: size={}, actorId={}, accepted={}", payload.size(), actorId, accepted);
        return accepted;
    }

    public List<AnalyticsEvent> eventsByActor(
            String actor,
            int limit,
            Integer recentMinutes,
            String eventName,
            String boxId
    ) {
        String normalized = normalizeTraceActor(actor);
        if (normalized.isBlank()) {
            return List.of();
        }
        String nameFilter = eventName == null ? "" : eventName.trim();
        String boxFilter = boxId == null ? "" : boxId.trim();
        String boxPayloadLike = boxFilter.isBlank() ? "" : "%" + boxFilter + "%";
        return jdbcTemplate.query(
                """
                        SELECT event_name, actor_id, payload_json, event_at
                        FROM analytics_event
                        WHERE actor_id = ?
                        AND (? <= 0 OR event_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE))
                        AND (? = '' OR event_name = ?)
                        AND (? = '' OR payload_json LIKE ?)
                        ORDER BY id DESC
                        LIMIT ?
                        """,
                (rs, rowNum) -> new AnalyticsEvent(
                        rs.getString("event_name"),
                        parsePayload(rs.getString("payload_json")),
                        rs.getTimestamp("event_at").toLocalDateTime().toString(),
                        rs.getString("actor_id")
                ),
                normalized,
                recentMinutes == null ? 0 : recentMinutes,
                recentMinutes == null ? 0 : recentMinutes,
                nameFilter,
                nameFilter,
                boxFilter,
                boxPayloadLike,
                Math.max(1, Math.min(limit, 200))
        );
    }

    private boolean recentlyIngested(String eventName, String actorId) {
        if (actorId.isBlank()) {
            return false;
        }
        List<Integer> hit = jdbcTemplate.query(
                """
                        SELECT 1 FROM analytics_event
                        WHERE event_name = ? AND actor_id = ?
                        AND event_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
                        LIMIT 1
                        """,
                (rs, rowNum) -> 1,
                eventName,
                actorId,
                DEDUP_WINDOW_MINUTES
        );
        return !hit.isEmpty();
    }

    private static String normalizeTraceActor(String actor) {
        if (actor == null) {
            return "";
        }
        String trimmed = actor.trim();
        if (trimmed.isBlank()) {
            return "";
        }
        if (trimmed.startsWith("guest:")) {
            return trimmed;
        }
        if (trimmed.matches("\\d+")) {
            return trimmed;
        }
        return "guest:" + trimmed;
    }

    public FunnelView funnel(Integer recentMinutes) {
        int exposure = countByPrefix("home_", recentMinutes)
                + countExact("app_open", recentMinutes)
                + countExact("home_view", recentMinutes)
                + countExact("mall_view", recentMinutes)
                + countExact("box_detail_view", recentMinutes)
                + countExact("warehouse_view", recentMinutes)
                + countExact("profile_view", recentMinutes);
        int clicks = countByPrefix("home_box_click", recentMinutes)
                + countByPrefix("mall_box_click", recentMinutes)
                + countByPrefix("box_create_order_click", recentMinutes)
                + countExact("box_detail_view", recentMinutes)
                + countExact("search_submit", recentMinutes)
                + countExact("start_checkout", recentMinutes)
                + countExact("confirm_pay_click", recentMinutes);
        int createOrder = countByPrefix("box_create_order_click", recentMinutes)
                + countExact("order_created", recentMinutes);
        int pay = countByPrefix("order_result_pay_now_click", recentMinutes)
                + countExact("payment_success", recentMinutes)
                + countExact("payment_wechat_requested", recentMinutes)
                + countExact("payment_vnpay_requested", recentMinutes)
                + countExact("payment_momo_requested", recentMinutes);
        int payWechatRequested = countExact("payment_wechat_requested", recentMinutes);
        int payVnpayRequested = countExact("payment_vnpay_requested", recentMinutes);
        int payMomoRequested = countExact("payment_momo_requested", recentMinutes);
        int share = countByPrefix("order_result_share_click", recentMinutes)
                + countExact("share_reveal", recentMinutes);
        int paymentFail = countExact("payment_fail", recentMinutes);
        int paymentCancel = countExact("payment_cancel", recentMinutes);
        int total = countAll(recentMinutes);
        int guestEventCount = countGuestEvents(recentMinutes);
        int guestUniqueDevices = countDistinctGuestActors(recentMinutes);
        int registeredUniqueActors = countDistinctRegisteredActors(recentMinutes);
        return new FunnelView(
                exposure,
                clicks,
                createOrder,
                pay,
                payWechatRequested,
                payVnpayRequested,
                payMomoRequested,
                share,
                paymentFail,
                paymentCancel,
                total,
                recentMinutes == null ? 0 : recentMinutes,
                guestEventCount,
                guestUniqueDevices,
                registeredUniqueActors
        );
    }

    public List<AnalyticsEvent> latest(int limit, Integer recentMinutes) {
        return jdbcTemplate.query(
                "SELECT event_name, actor_id, payload_json, event_at FROM analytics_event WHERE (? <= 0 OR event_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)) ORDER BY id DESC LIMIT ?",
                (rs, rowNum) -> new AnalyticsEvent(
                        rs.getString("event_name"),
                        parsePayload(rs.getString("payload_json")),
                        rs.getTimestamp("event_at").toLocalDateTime().toString(),
                        rs.getString("actor_id")
                ),
                recentMinutes == null ? 0 : recentMinutes,
                recentMinutes == null ? 0 : recentMinutes,
                Math.max(1, limit)
        );
    }

    public List<TrendPoint> trendByHour(Integer recentMinutes) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM-dd HH:00");
        Map<String, Integer> counter = new LinkedHashMap<>();
        List<LocalDateTime> times = jdbcTemplate.query(
                "SELECT event_at FROM analytics_event WHERE (? <= 0 OR event_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)) ORDER BY event_at ASC",
                (rs, rowNum) -> rs.getTimestamp("event_at").toLocalDateTime(),
                recentMinutes == null ? 0 : recentMinutes,
                recentMinutes == null ? 0 : recentMinutes
        );
        for (LocalDateTime eventTime : times) {
            String key = eventTime.withMinute(0).withSecond(0).withNano(0).format(formatter);
            counter.put(key, counter.getOrDefault(key, 0) + 1);
        }
        return counter.entrySet().stream().map(item -> new TrendPoint(item.getKey(), item.getValue())).toList();
    }

    public List<TopEventItem> topEvents(Integer recentMinutes, int limit) {
        return jdbcTemplate.query(
                "SELECT event_name, COUNT(1) cnt FROM analytics_event WHERE (? <= 0 OR event_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)) GROUP BY event_name ORDER BY cnt DESC LIMIT ?",
                (rs, rowNum) -> new TopEventItem(rs.getString("event_name"), rs.getInt("cnt")),
                recentMinutes == null ? 0 : recentMinutes,
                recentMinutes == null ? 0 : recentMinutes,
                Math.max(1, limit)
        );
    }

    public RetentionOverview retentionOverview() {
        Integer dau = jdbcTemplate.queryForObject(
                "SELECT COUNT(DISTINCT actor_id) FROM analytics_event WHERE actor_id <> '' AND event_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)",
                Integer.class
        );
        Integer wau = jdbcTemplate.queryForObject(
                "SELECT COUNT(DISTINCT actor_id) FROM analytics_event WHERE actor_id <> '' AND event_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)",
                Integer.class
        );
        Integer mau = jdbcTemplate.queryForObject(
                "SELECT COUNT(DISTINCT actor_id) FROM analytics_event WHERE actor_id <> '' AND event_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)",
                Integer.class
        );
        Integer day1Retained = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM (" +
                        "SELECT actor_id FROM analytics_event WHERE actor_id <> '' GROUP BY actor_id " +
                        "HAVING DATEDIFF(MAX(event_at), MIN(event_at)) >= 1) t",
                Integer.class
        );
        int d = dau == null ? 0 : dau;
        int w = wau == null ? 0 : wau;
        int m = mau == null ? 0 : mau;
        int retained = day1Retained == null ? 0 : day1Retained;
        int day1Rate = w <= 0 ? 0 : (int) Math.round((retained * 100.0) / w);
        return new RetentionOverview(d, w, m, retained, day1Rate);
    }

    private int countByPrefix(String prefix, Integer recentMinutes) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM analytics_event WHERE event_name LIKE ? AND (? <= 0 OR event_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE))",
                Integer.class,
                prefix + "%",
                recentMinutes == null ? 0 : recentMinutes,
                recentMinutes == null ? 0 : recentMinutes
        );
        return count == null ? 0 : count;
    }

    private int countExact(String eventName, Integer recentMinutes) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM analytics_event WHERE event_name = ? AND (? <= 0 OR event_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE))",
                Integer.class,
                eventName,
                recentMinutes == null ? 0 : recentMinutes,
                recentMinutes == null ? 0 : recentMinutes
        );
        return count == null ? 0 : count;
    }

    private int countGuestEvents(Integer recentMinutes) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM analytics_event WHERE actor_id LIKE 'guest:%' AND (? <= 0 OR event_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE))",
                Integer.class,
                recentMinutes == null ? 0 : recentMinutes,
                recentMinutes == null ? 0 : recentMinutes
        );
        return count == null ? 0 : count;
    }

    private int countDistinctGuestActors(Integer recentMinutes) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(DISTINCT actor_id) FROM analytics_event WHERE actor_id LIKE 'guest:%' AND (? <= 0 OR event_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE))",
                Integer.class,
                recentMinutes == null ? 0 : recentMinutes,
                recentMinutes == null ? 0 : recentMinutes
        );
        return count == null ? 0 : count;
    }

    private int countDistinctRegisteredActors(Integer recentMinutes) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(DISTINCT actor_id) FROM analytics_event
                        WHERE actor_id <> '' AND actor_id NOT LIKE 'guest:%'
                        AND (? <= 0 OR event_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE))
                        """,
                Integer.class,
                recentMinutes == null ? 0 : recentMinutes,
                recentMinutes == null ? 0 : recentMinutes
        );
        return count == null ? 0 : count;
    }

    private LocalDateTime parseAt(String at) {
        if (at == null || at.isBlank()) {
            return null;
        }
        try {
            return OffsetDateTime.parse(at).atZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime();
        } catch (Exception ignored) {
            try {
                return LocalDateTime.parse(at);
            } catch (Exception ignoredAgain) {
                return null;
            }
        }
    }

    private int countAll(Integer recentMinutes) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM analytics_event WHERE (? <= 0 OR event_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE))",
                Integer.class,
                recentMinutes == null ? 0 : recentMinutes,
                recentMinutes == null ? 0 : recentMinutes
        );
        return count == null ? 0 : count;
    }

    private Map<String, Object> parsePayload(String payloadJson) {
        try {
            return objectMapper.readValue(payloadJson, Map.class);
        } catch (Exception ignored) {
            return Map.of();
        }
    }

    public record AnalyticsEventInput(
            String name,
            Map<String, Object> payload,
            String at
    ) {
    }

    @Getter
    public static class AnalyticsEvent {
        private final String name;
        private final Map<String, Object> payload;
        private final String at;
        private final String actorId;

        public AnalyticsEvent(String name, Map<String, Object> payload, String at, String actorId) {
            this.name = name;
            this.payload = payload;
            this.at = at;
            this.actorId = actorId;
        }
    }

    public record FunnelView(
            int exposure,
            int clicks,
            int createOrder,
            int pay,
            int payWechatRequested,
            int payVnpayRequested,
            int payMomoRequested,
            int share,
            int paymentFail,
            int paymentCancel,
            int totalEvents,
            int windowMinutes,
            int guestEventCount,
            int guestUniqueDevices,
            int registeredUniqueActors
    ) {
    }

    public record TrendPoint(
            String hour,
            int count
    ) {
    }

    public record TopEventItem(
            String name,
            int count
    ) {
    }

    public record RetentionOverview(
            int dau,
            int wau,
            int mau,
            int day1RetainedUsers,
            int day1RetentionRate
    ) {
    }
}
