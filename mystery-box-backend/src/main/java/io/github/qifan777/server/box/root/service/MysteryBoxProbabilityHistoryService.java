package io.github.qifan777.server.box.root.service;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.IdUtil;
import io.github.qifan777.server.notification.service.UserNotificationService;
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
public class MysteryBoxProbabilityHistoryService {

    private static final int RECENT_DRAWER_LIMIT = 200;

    private final JdbcTemplate jdbcTemplate;
    private final UserNotificationService userNotificationService;

    public void recordIfChanged(String mysteryBoxId, int legendaryRate, int hiddenRate, int generalRate) {
        List<Map<String, Object>> latest = jdbcTemplate.queryForList(
                """
                        SELECT legendary_rate, hidden_rate, general_rate
                        FROM mystery_box_probability_history
                        WHERE mystery_box_id = ?
                        ORDER BY effective_time DESC
                        LIMIT 1
                        """,
                mysteryBoxId
        );
        if (!latest.isEmpty()) {
            Map<String, Object> row = latest.get(0);
            if (legendaryRate == ((Number) row.get("legendary_rate")).intValue()
                    && hiddenRate == ((Number) row.get("hidden_rate")).intValue()
                    && generalRate == ((Number) row.get("general_rate")).intValue()) {
                return;
            }
        }
        String operatorId = StpUtil.isLogin() ? StpUtil.getLoginIdAsString() : null;
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update(
                """
                        INSERT INTO mystery_box_probability_history
                        (id, mystery_box_id, legendary_rate, hidden_rate, general_rate, effective_time, operator_id, created_time)
                        VALUES (?,?,?,?,?,?,?,?)
                        """,
                IdUtil.fastSimpleUUID(),
                mysteryBoxId,
                legendaryRate,
                hiddenRate,
                generalRate,
                now,
                operatorId,
                now
        );
        notifyProbabilityChange(mysteryBoxId, legendaryRate, hiddenRate, generalRate, operatorId);
    }

    private void notifyProbabilityChange(
            String mysteryBoxId,
            int legendaryRate,
            int hiddenRate,
            int generalRate,
            String operatorId
    ) {
        String title = "盲盒概率已更新";
        String body = String.format(
                "该盲盒公示概率已调整（传说 %d / 隐藏 %d / 普通 %d，基数 10000），请以详情页最新公示为准。",
                legendaryRate, hiddenRate, generalRate
        );
        if (operatorId != null && !operatorId.isBlank()) {
            try {
                userNotificationService.push(operatorId, "PROBABILITY_CHANGE", title, "[运营审计] " + body, mysteryBoxId);
            } catch (Exception ex) {
                log.warn("Failed to notify operator of probability change: {}", ex.getMessage());
            }
        }
        try {
            List<String> recentDrawers = jdbcTemplate.query(
                    """
                            SELECT user_id FROM (
                                SELECT user_id, MAX(created_time) AS last_draw
                                FROM mystery_box_draw_log
                                WHERE mystery_box_id = ?
                                GROUP BY user_id
                                ORDER BY last_draw DESC
                                LIMIT ?
                            ) recent
                            """,
                    (rs, rowNum) -> rs.getString("user_id"),
                    mysteryBoxId,
                    RECENT_DRAWER_LIMIT
            );
            if (!recentDrawers.isEmpty()) {
                userNotificationService.pushBulk(
                        recentDrawers,
                        "PROBABILITY_CHANGE",
                        title,
                        body,
                        mysteryBoxId
                );
            }
        } catch (Exception ex) {
            log.warn("Failed to fan out probability-change notification for box {}: {}", mysteryBoxId, ex.getMessage());
        }
    }

    public List<ProbabilityHistoryView> list(String mysteryBoxId, int limit) {
        int size = limit <= 0 ? 10 : Math.min(limit, 50);
        return jdbcTemplate.query(
                """
                        SELECT legendary_rate, hidden_rate, general_rate, effective_time, operator_id
                        FROM mystery_box_probability_history
                        WHERE mystery_box_id = ?
                        ORDER BY effective_time DESC
                        LIMIT ?
                        """,
                (rs, rowNum) -> new ProbabilityHistoryView(
                        rs.getInt("legendary_rate"),
                        rs.getInt("hidden_rate"),
                        rs.getInt("general_rate"),
                        rs.getTimestamp("effective_time").toLocalDateTime(),
                        rs.getString("operator_id")
                ),
                mysteryBoxId,
                size
        );
    }

    public record ProbabilityHistoryView(
            int legendaryRate,
            int hiddenRate,
            int generalRate,
            LocalDateTime effectiveTime,
            String operatorId
    ) {
    }
}
