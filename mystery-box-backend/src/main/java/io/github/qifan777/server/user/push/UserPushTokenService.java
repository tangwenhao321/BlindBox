package io.github.qifan777.server.user.push;

import cn.hutool.core.util.IdUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserPushTokenService {

    private final JdbcTemplate jdbcTemplate;

    /** All devices a user has registered. A user signed in on phone and tablet has one row each. */
    public List<String> findTokens(String userId) {
        if (userId == null || userId.isBlank()) {
            return List.of();
        }
        return jdbcTemplate.query(
                """
                        SELECT expo_push_token FROM user_push_token
                        WHERE user_id = ? AND expo_push_token IS NOT NULL AND expo_push_token <> ''
                        ORDER BY updated_time DESC
                        """,
                (rs, rowNum) -> rs.getString("expo_push_token"),
                userId
        );
    }

    /** Devices for a batch of users in one round-trip, for fan-out to a user segment. */
    public List<PushTarget> findTargets(Collection<String> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return List.of();
        }
        List<String> ids = userIds.stream().filter(id -> id != null && !id.isBlank()).distinct().toList();
        if (ids.isEmpty()) {
            return List.of();
        }
        String placeholders = String.join(",", ids.stream().map(id -> "?").toList());
        return jdbcTemplate.query(
                """
                        SELECT user_id, expo_push_token FROM user_push_token
                        WHERE user_id IN (%s)
                          AND expo_push_token IS NOT NULL AND expo_push_token <> ''
                        """.formatted(placeholders),
                TARGET_MAPPER,
                ids.toArray()
        );
    }

    /**
     * Pages over registered devices for broadcast pushes. Rows with a blank platform are included so
     * clients registered before the platform column was populated still receive notices.
     * {@code releaseChannel == null} means every channel.
     *
     * @deprecated Prefer {@link #listTargetsByPlatformAndChannel} so update pushes stay channel-scoped.
     */
    @Deprecated
    public List<PushTarget> listTargetsByPlatform(String platform, int offset, int limit) {
        return listTargetsByPlatformAndChannel(platform, null, offset, limit);
    }

    /**
     * Pages over devices for a platform and release channel. After the release_channel backfill,
     * filtering uses an exact match. A null/blank channel returns every channel for that platform.
     */
    public List<PushTarget> listTargetsByPlatformAndChannel(
            String platform,
            String releaseChannel,
            int offset,
            int limit
    ) {
        int size = Math.min(Math.max(limit, 1), 1000);
        int start = Math.max(offset, 0);
        String channel = normalizeReleaseChannelOrNull(releaseChannel);
        if (platform == null || platform.isBlank()) {
            if (channel == null) {
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
                              AND release_channel = ?
                            ORDER BY id LIMIT ? OFFSET ?
                            """,
                    TARGET_MAPPER,
                    channel,
                    size,
                    start
            );
        }
        String platformKey = platform.trim().toLowerCase();
        if (channel == null) {
            return jdbcTemplate.query(
                    """
                            SELECT user_id, expo_push_token FROM user_push_token
                            WHERE expo_push_token IS NOT NULL AND expo_push_token <> ''
                              AND (platform IS NULL OR platform = '' OR LOWER(platform) = ?)
                            ORDER BY id LIMIT ? OFFSET ?
                            """,
                    TARGET_MAPPER,
                    platformKey,
                    size,
                    start
            );
        }
        return jdbcTemplate.query(
                """
                        SELECT user_id, expo_push_token FROM user_push_token
                        WHERE expo_push_token IS NOT NULL AND expo_push_token <> ''
                          AND (platform IS NULL OR platform = '' OR LOWER(platform) = ?)
                          AND release_channel = ?
                        ORDER BY id LIMIT ? OFFSET ?
                        """,
                TARGET_MAPPER,
                platformKey,
                channel,
                size,
                start
        );
    }

    public void upsert(String userId, String expoPushToken, String platform, String releaseChannel) {
        if (userId == null || userId.isBlank() || expoPushToken == null || expoPushToken.isBlank()) {
            return;
        }
        String channel = normalizeReleaseChannel(releaseChannel);
        // Keyed on the token, not the user: re-registering the same device refreshes its row, while a
        // device that switches accounts is reassigned instead of leaving a stale row behind.
        jdbcTemplate.update(
                """
                        INSERT INTO user_push_token (id, user_id, expo_push_token, platform, release_channel, updated_time)
                        VALUES (?,?,?,?,?,?)
                        ON DUPLICATE KEY UPDATE
                            user_id = VALUES(user_id),
                            platform = VALUES(platform),
                            release_channel = VALUES(release_channel),
                            updated_time = VALUES(updated_time)
                        """,
                IdUtil.fastSimpleUUID(),
                userId,
                expoPushToken.trim(),
                platform,
                channel,
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

    /** Blank/null → production so legacy clients still land on the default channel. */
    private static String normalizeReleaseChannel(String releaseChannel) {
        if (releaseChannel == null || releaseChannel.isBlank()) {
            return "production";
        }
        return releaseChannel.trim();
    }

    /** Blank/null → null meaning "all channels" for list queries. */
    private static String normalizeReleaseChannelOrNull(String releaseChannel) {
        if (releaseChannel == null || releaseChannel.isBlank()) {
            return null;
        }
        return releaseChannel.trim();
    }

    private static final RowMapper<PushTarget> TARGET_MAPPER =
            (rs, rowNum) -> new PushTarget(rs.getString("user_id"), rs.getString("expo_push_token"));

    public record PushTarget(String userId, String expoPushToken) {
    }
}
