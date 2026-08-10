package io.github.qifan777.server.activity.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MysteryBoxActivityService {
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public List<ActivityView> active() {
        return jdbcTemplate.query(
                """
                        SELECT id, title, banner, subtitle, end_time, box_ids
                        FROM mystery_box_activity
                        WHERE enabled = 1 AND end_time > ?
                        ORDER BY sort_order ASC, end_time ASC
                        """,
                (rs, rowNum) -> {
                    List<String> boxIds = parseBoxIds(rs.getString("box_ids"));
                    return new ActivityView(
                            rs.getString("id"),
                            rs.getString("title"),
                            rs.getString("banner"),
                            rs.getString("subtitle"),
                            rs.getTimestamp("end_time").toLocalDateTime(),
                            boxIds
                    );
                },
                LocalDateTime.now()
        );
    }

    public ActivityDetailView detail(String id) {
        jdbcTemplate.update("UPDATE mystery_box_activity SET view_count = view_count + 1 WHERE id = ?", id);
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                """
                        SELECT id, title, banner, subtitle, end_time, box_ids, enabled
                        FROM mystery_box_activity WHERE id = ?
                        """,
                id
        );
        if (rows.isEmpty()) {
            throw new BusinessException("活动不存在");
        }
        Map<String, Object> row = rows.get(0);
        List<String> boxIds = parseBoxIds((String) row.get("box_ids"));
        List<ActivityBoxSummary> boxes = loadBoxSummaries(boxIds);
        return new ActivityDetailView(
                (String) row.get("id"),
                (String) row.get("title"),
                (String) row.get("banner"),
                (String) row.get("subtitle"),
                ((java.sql.Timestamp) row.get("end_time")).toLocalDateTime(),
                boxIds,
                boxes
        );
    }

    private List<ActivityBoxSummary> loadBoxSummaries(List<String> boxIds) {
        if (boxIds.isEmpty()) {
            return List.of();
        }
        String placeholders = boxIds.stream().map(id -> "?").collect(Collectors.joining(","));
        List<Object> args = new ArrayList<>(boxIds);
        return jdbcTemplate.query(
                "SELECT id, name, cover, price FROM mystery_box WHERE id IN (" + placeholders + ")",
                (rs, rowNum) -> new ActivityBoxSummary(
                        rs.getString("id"),
                        rs.getString("name"),
                        rs.getString("cover"),
                        rs.getDouble("price")
                ),
                args.toArray()
        );
    }

    private List<String> parseBoxIds(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {
            });
        } catch (Exception ex) {
            return Collections.emptyList();
        }
    }

    public record ActivityView(
            String id,
            String title,
            String banner,
            String subtitle,
            LocalDateTime endTime,
            List<String> boxIds
    ) {
    }

    public record ActivityBoxSummary(String id, String name, String cover, double price) {
    }

    public record ActivityDetailView(
            String id,
            String title,
            String banner,
            String subtitle,
            LocalDateTime endTime,
            List<String> boxIds,
            List<ActivityBoxSummary> boxes
    ) {
    }
}
