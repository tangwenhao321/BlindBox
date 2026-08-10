package io.github.qifan777.server.ops.service;

import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class FeatureFlagService {
    private final JdbcTemplate jdbcTemplate;

    public Map<String, Boolean> allAsMap() {
        Map<String, Boolean> flags = new LinkedHashMap<>();
        for (FeatureFlag flag : list()) {
            flags.put(flag.flagKey(), flag.enabled());
        }
        return flags;
    }

    public List<FeatureFlag> list() {
        return jdbcTemplate.query(
                """
                        SELECT id, flag_key, enabled, description, created_time, edited_time
                        FROM ops_feature_flag
                        ORDER BY flag_key ASC
                        """,
                (rs, rowNum) -> new FeatureFlag(
                        rs.getLong("id"),
                        rs.getString("flag_key"),
                        rs.getBoolean("enabled"),
                        rs.getString("description"),
                        rs.getTimestamp("created_time").toLocalDateTime(),
                        rs.getTimestamp("edited_time").toLocalDateTime()
                )
        );
    }

    public FeatureFlag getByKey(String flagKey) {
        List<FeatureFlag> rows = jdbcTemplate.query(
                """
                        SELECT id, flag_key, enabled, description, created_time, edited_time
                        FROM ops_feature_flag
                        WHERE flag_key = ?
                        """,
                (rs, rowNum) -> new FeatureFlag(
                        rs.getLong("id"),
                        rs.getString("flag_key"),
                        rs.getBoolean("enabled"),
                        rs.getString("description"),
                        rs.getTimestamp("created_time").toLocalDateTime(),
                        rs.getTimestamp("edited_time").toLocalDateTime()
                ),
                flagKey
        );
        if (rows.isEmpty()) {
            throw new BusinessException("功能开关不存在: " + flagKey);
        }
        return rows.get(0);
    }

    public FeatureFlag create(FeatureFlagInput input) {
        String key = normalizeKey(input.flagKey());
        if (!StringUtils.hasText(key)) {
            throw new BusinessException("flagKey 不能为空");
        }
        Integer existing = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM ops_feature_flag WHERE flag_key = ?",
                Integer.class,
                key
        );
        if (existing != null && existing > 0) {
            throw new BusinessException("功能开关已存在: " + key);
        }
        jdbcTemplate.update(
                """
                        INSERT INTO ops_feature_flag(flag_key, enabled, description, created_time, edited_time)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                key,
                input.enabled(),
                input.description() == null ? "" : input.description(),
                LocalDateTime.now(),
                LocalDateTime.now()
        );
        return getByKey(key);
    }

    public FeatureFlag update(String flagKey, FeatureFlagInput input) {
        getByKey(flagKey);
        jdbcTemplate.update(
                """
                        UPDATE ops_feature_flag
                        SET enabled = ?, description = ?, edited_time = ?
                        WHERE flag_key = ?
                        """,
                input.enabled(),
                input.description() == null ? "" : input.description(),
                LocalDateTime.now(),
                flagKey
        );
        return getByKey(flagKey);
    }

    public void delete(String flagKey) {
        int deleted = jdbcTemplate.update("DELETE FROM ops_feature_flag WHERE flag_key = ?", flagKey);
        if (deleted == 0) {
            throw new BusinessException("功能开关不存在: " + flagKey);
        }
    }

    private static String normalizeKey(String flagKey) {
        return flagKey == null ? "" : flagKey.trim();
    }

    public record FeatureFlag(
            long id,
            String flagKey,
            boolean enabled,
            String description,
            LocalDateTime createdTime,
            LocalDateTime editedTime
    ) {
    }

    public record FeatureFlagInput(
            String flagKey,
            boolean enabled,
            String description
    ) {
    }
}
