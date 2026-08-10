package io.github.qifan777.server.user.push;

import cn.hutool.core.util.IdUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserPushTokenService {

    private final JdbcTemplate jdbcTemplate;

    public String findToken(String userId) {
        if (userId == null || userId.isBlank()) {
            return null;
        }
        List<String> tokens = jdbcTemplate.query(
                "SELECT expo_push_token FROM user_push_token WHERE user_id = ? LIMIT 1",
                (rs, rowNum) -> rs.getString("expo_push_token"),
                userId
        );
        return tokens.isEmpty() ? null : tokens.get(0);
    }

    /**
     * Pages over registered devices for broadcast pushes. Rows with a blank platform are included so
     * clients registered before the platform column was populated still receive notices.
     */
    public List<PushTarget> listTargetsByPlatform(String platform, int offset, int limit) {
        int size = Math.min(Math.max(limit, 1), 1000);
        int start = Math.max(offset, 0);
        if (platform == null || platform.isBlank()) {
            return jdbcTemplate.query(
                    """
                            SELECT user_id, expo_push_token FROM user_push_token
                            WHERE expo_push_token IS NOT NULL AND expo_push_token <> ''
                            ORDER BY id LIMIT ? OFFSET ?
                            """,
                    TARGET_MAPPER,
                    size,
                    start
            );
        }
        return jdbcTemplate.query(
                """
                        SELECT user_id, expo_push_token FROM user_push_token
                        WHERE expo_push_token IS NOT NULL AND expo_push_token <> ''
                          AND (platform IS NULL OR platform = '' OR LOWER(platform) = ?)
                        ORDER BY id LIMIT ? OFFSET ?
                        """,
                TARGET_MAPPER,
                platform.trim().toLowerCase(),
                size,
                start
        );
    }

    public void upsert(String userId, String expoPushToken, String platform) {
        if (userId == null || userId.isBlank() || expoPushToken == null || expoPushToken.isBlank()) {
            return;
        }
        jdbcTemplate.update("DELETE FROM user_push_token WHERE user_id = ?", userId);
        jdbcTemplate.update(
                """
                        INSERT INTO user_push_token (id, user_id, expo_push_token, platform, updated_time)
                        VALUES (?,?,?,?,?)
                        """,
                IdUtil.fastSimpleUUID(),
                userId,
                expoPushToken.trim(),
                platform,
                LocalDateTime.now()
        );
    }

    public void deleteByUserId(String userId) {
        if (userId == null || userId.isBlank()) {
            return;
        }
        jdbcTemplate.update("DELETE FROM user_push_token WHERE user_id = ?", userId);
    }

    public void deleteByToken(String expoPushToken) {
        if (expoPushToken == null || expoPushToken.isBlank()) {
            return;
        }
        jdbcTemplate.update("DELETE FROM user_push_token WHERE expo_push_token = ?", expoPushToken.trim());
    }

    private static final RowMapper<PushTarget> TARGET_MAPPER =
            (rs, rowNum) -> new PushTarget(rs.getString("user_id"), rs.getString("expo_push_token"));

    public record PushTarget(String userId, String expoPushToken) {
    }
}
