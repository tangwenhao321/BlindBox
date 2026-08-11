package io.github.qifan777.server.notification.service;

import cn.hutool.core.util.IdUtil;
import io.github.qifan777.server.user.notification.NotificationPrefGate;
import io.github.qifan777.server.user.notification.UserNotificationPrefService;
import io.github.qifan777.server.user.notification.dto.NotificationPrefView;
import io.github.qifan777.server.user.push.UserPushTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserNotificationService {
    private static final int BULK_CHUNK_SIZE = 500;

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
        List<ExpoPushNotificationService.PushMessage> messages =
                preparePushMessages(userId, category, title, body, refId);
        if (!messages.isEmpty()) {
            expoPushNotificationService.sendBatch(messages);
        }
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

    /**
     * Fans a single message out to many users. Notification rows are batch-inserted and push messages
     * are grouped per chunk, so a segment of N users costs a handful of queries and one Expo request
     * per chunk instead of 2N queries and N HTTP round-trips.
     *
     * @return how many users had an in-app notification written
     */
    public int pushBulk(List<String> userIds, String category, String title, String body, String refId) {
        if (userIds == null || userIds.isEmpty()) {
            return 0;
        }
        List<String> recipients = userIds.stream().filter(id -> id != null && !id.isBlank()).distinct().toList();
        int persisted = 0;
        for (int start = 0; start < recipients.size(); start += BULK_CHUNK_SIZE) {
            List<String> chunk = recipients.subList(start, Math.min(start + BULK_CHUNK_SIZE, recipients.size()));
            persisted += persistBulk(chunk, category, title, body, refId);
            List<ExpoPushNotificationService.PushMessage> messages =
                    prepareBulkPushMessages(chunk, category, title, body, refId);
            if (!messages.isEmpty()) {
                expoPushNotificationService.sendBatch(messages);
            }
        }
        return persisted;
    }

    private int persistBulk(List<String> userIds, String category, String title, String body, String refId) {
        Timestamp now = Timestamp.valueOf(LocalDateTime.now());
        List<Object[]> rows = userIds.stream()
                .map(userId -> new Object[]{IdUtil.fastSimpleUUID(), userId, category, title, body, refId, now})
                .toList();
        jdbcTemplate.batchUpdate(
                """
                        INSERT INTO user_notification (id, user_id, category, title, body, ref_id, read_flag, created_time)
                        VALUES (?,?,?,?,?,?,0,?)
                        """,
                rows
        );
        return rows.size();
    }

    private List<ExpoPushNotificationService.PushMessage> prepareBulkPushMessages(
            List<String> userIds,
            String category,
            String title,
            String body,
            String refId
    ) {
        Map<String, NotificationPrefView> prefs = userNotificationPrefService.findAll(userIds);
        return userPushTokenService.findTargets(userIds).stream()
                .filter(target -> NotificationPrefGate.allowsPush(
                        prefs.getOrDefault(target.userId(), UserNotificationPrefService.defaults()), category))
                .map(target -> new ExpoPushNotificationService.PushMessage(
                        target.userId(), title, body, category, refId, target.expoPushToken()))
                .toList();
    }

    /** One message per registered device, so multi-device users are notified everywhere. */
    public List<ExpoPushNotificationService.PushMessage> preparePushMessages(
            String userId,
            String category,
            String title,
            String body,
            String refId
    ) {
        NotificationPrefView pref = userNotificationPrefService.get(userId);
        if (!NotificationPrefGate.allowsPush(pref, category)) {
            return List.of();
        }
        return userPushTokenService.findTokens(userId).stream()
                .map(token -> new ExpoPushNotificationService.PushMessage(userId, title, body, category, refId, token))
                .toList();
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
