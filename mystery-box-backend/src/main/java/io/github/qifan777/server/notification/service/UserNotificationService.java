package io.github.qifan777.server.notification.service;

import cn.hutool.core.util.IdUtil;
import io.github.qifan777.server.user.notification.NotificationPrefGate;
import io.github.qifan777.server.user.notification.UserNotificationPrefService;
import io.github.qifan777.server.user.notification.dto.NotificationPrefView;
import io.github.qifan777.server.user.push.UserPushTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserNotificationService {
    private final JdbcTemplate jdbcTemplate;
    private final ExpoPushNotificationService expoPushNotificationService;
    private final UserNotificationPrefService userNotificationPrefService;
    private final UserPushTokenService userPushTokenService;

    public List<NotificationView> listForUser(String userId, int limit) {
        int size = Math.min(Math.max(limit, 1), 50);
        return jdbcTemplate.query(
                """
                        SELECT id, category, title, body, ref_id, read_flag, created_time
                        FROM user_notification
                        WHERE user_id = ?
                        ORDER BY created_time DESC
                        LIMIT ?
                        """,
                (rs, rowNum) -> new NotificationView(
                        rs.getString("id"),
                        rs.getString("category"),
                        rs.getString("title"),
                        rs.getString("body"),
                        rs.getString("ref_id"),
                        rs.getInt("read_flag") == 1,
                        rs.getTimestamp("created_time").toLocalDateTime()
                ),
                userId,
                size
        );
    }

    public int unreadCount(String userId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM user_notification WHERE user_id = ? AND read_flag = 0",
                Integer.class,
                userId
        );
        return count == null ? 0 : count;
    }

    public void markRead(String userId, List<String> ids) {
        if (ids == null || ids.isEmpty()) {
            return;
        }
        String placeholders = String.join(",", ids.stream().map(id -> "?").toList());
        Object[] args = new Object[ids.size() + 1];
        args[0] = userId;
        for (int i = 0; i < ids.size(); i++) {
            args[i + 1] = ids.get(i);
        }
        jdbcTemplate.update(
                "UPDATE user_notification SET read_flag = 1 WHERE user_id = ? AND id IN (" + placeholders + ")",
                args
        );
    }

    public void push(String userId, String category, String title, String body, String refId) {
        persist(userId, category, title, body, refId);
        preparePushMessage(userId, category, title, body, refId)
                .ifPresent(message -> expoPushNotificationService.sendBatch(List.of(message)));
    }

    public void persist(String userId, String category, String title, String body, String refId) {
        jdbcTemplate.update(
                """
                        INSERT INTO user_notification (id, user_id, category, title, body, ref_id, read_flag, created_time)
                        VALUES (?,?,?,?,?,?,0,?)
                        """,
                IdUtil.fastSimpleUUID(),
                userId,
                category,
                title,
                body,
                refId,
                LocalDateTime.now()
        );
    }

    public Optional<ExpoPushNotificationService.PushMessage> preparePushMessage(
            String userId,
            String category,
            String title,
            String body,
            String refId
    ) {
        NotificationPrefView pref = userNotificationPrefService.get(userId);
        if (!NotificationPrefGate.allowsPush(pref, category)) {
            return Optional.empty();
        }
        String token = userPushTokenService.findToken(userId);
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        return Optional.of(new ExpoPushNotificationService.PushMessage(userId, title, body, category, refId, token));
    }

    public record NotificationView(
            String id,
            String category,
            String title,
            String body,
            String refId,
            boolean read,
            LocalDateTime createdTime
    ) {
    }
}
