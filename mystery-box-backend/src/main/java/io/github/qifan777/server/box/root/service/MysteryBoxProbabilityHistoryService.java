package io.github.qifan777.server.box.root.service;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.IdUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MysteryBoxProbabilityHistoryService {

    private final JdbcTemplate jdbcTemplate;

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
                LocalDateTime.now(),
                operatorId,
                LocalDateTime.now()
        );
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
