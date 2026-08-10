package io.github.qifan777.server.risk.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RiskControlService {
    private final JdbcTemplate jdbcTemplate;

    @Value("${security.risk-control.enabled:true}")
    private boolean enabled;
    @Value("${security.risk-control.confirm-threshold:80}")
    private int confirmThreshold;

    public RiskDecision evaluateOrderAction(String userId, String deviceId, String ip) {
        if (!enabled) {
            return new RiskDecision(0, false, "disabled");
        }
        int score = 0;
        if (deviceId == null || deviceId.isBlank()) {
            score += 30;
        }
        if (ip == null || ip.isBlank()) {
            score += 10;
        }
        Integer recentCreate = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM mystery_box_order WHERE creator_id = ? AND created_time >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)",
                Integer.class,
                userId == null ? "" : userId
        );
        if (recentCreate != null && recentCreate > 4) {
            score += 60;
        } else if (recentCreate != null && recentCreate > 2) {
            score += 35;
        }
        return new RiskDecision(score, score >= confirmThreshold, "recentCreate=" + (recentCreate == null ? 0 : recentCreate));
    }

    public record RiskDecision(
            int score,
            boolean requireConfirm,
            String reason
    ) {
    }
}
