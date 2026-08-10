package io.github.qifan777.server.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentReliabilityService {
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public void recordPaymentEvent(String actorId, String orderId, String phase, String status, String reason, int retryCount) {
        try {
            jdbcTemplate.update(
                    "INSERT INTO analytics_event(event_name, actor_id, payload_json, event_at) VALUES (?, ?, ?, ?)",
                    "payment_" + phase + "_" + status,
                    actorId == null ? "" : actorId,
                    objectMapper.writeValueAsString(Map.of(
                            "orderId", orderId == null ? "" : orderId,
                            "phase", phase,
                            "status", status,
                            "reason", reason == null ? "" : reason,
                            "retryCount", retryCount
                    )),
                    LocalDateTime.now()
            );
        } catch (Exception ex) {
            log.warn("recordPaymentEvent failed orderId={} phase={} status={}", orderId, phase, status, ex);
        }
    }

    public PaymentHealthOverview healthOverview(Integer recentMinutes) {
        int minutes = recentMinutes == null ? 60 : Math.max(1, recentMinutes);
        Integer attempts = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM analytics_event WHERE event_name LIKE 'payment_prepay_%' AND event_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)",
                Integer.class,
                minutes
        );
        Integer success = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM analytics_event WHERE event_name = 'payment_prepay_success' AND event_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)",
                Integer.class,
                minutes
        );
        Integer fail = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM analytics_event WHERE event_name = 'payment_prepay_fail' AND event_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)",
                Integer.class,
                minutes
        );
        List<FailureReason> reasons = jdbcTemplate.query(
                "SELECT CAST(JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.reason')) AS CHAR) as reason, COUNT(1) as cnt " +
                        "FROM analytics_event WHERE event_name = 'payment_prepay_fail' " +
                        "AND event_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE) " +
                        "GROUP BY reason ORDER BY cnt DESC LIMIT 5",
                (rs, rowNum) -> new FailureReason(rs.getString("reason"), rs.getInt("cnt")),
                minutes
        );
        int attemptValue = attempts == null ? 0 : attempts;
        int successValue = success == null ? 0 : success;
        int failValue = fail == null ? 0 : fail;
        int successRate = attemptValue <= 0 ? 0 : (int) Math.round((successValue * 100.0) / attemptValue);
        return new PaymentHealthOverview(attemptValue, successValue, failValue, successRate, minutes, reasons);
    }

    public record PaymentHealthOverview(
            int attempts,
            int success,
            int fail,
            int successRate,
            int windowMinutes,
            List<FailureReason> failReasons
    ) {
    }

    public record FailureReason(
            String reason,
            int count
    ) {
    }
}
