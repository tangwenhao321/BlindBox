package io.github.qifan777.server.appversion.service;

import cn.hutool.core.util.IdUtil;
import io.github.qifan777.server.notification.service.ExpoPushNotificationService;
import io.github.qifan777.server.user.push.UserPushTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Broadcasts a "new version available" notification to every registered device.
 *
 * <p>This is the server-initiated half of app updates: the client already polls
 * {@code front/app/update-check} on launch/foreground, but without a push the user only learns
 * about a release the next time they happen to open the app.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AppVersionPushService {
    public static final String CATEGORY = "APP_UPDATE";

    private static final int PAGE_SIZE = 500;

    private final JdbcTemplate jdbcTemplate;
    private final ExpoPushNotificationService expoPushNotificationService;
    private final UserPushTokenService userPushTokenService;
    private final AppVersionReleaseService appVersionReleaseService;

    @Value("${app.mobile-update.push-enabled:true}")
    private boolean pushEnabled;

    /**
     * Fired from the admin publish/push endpoints. Runs async because a large install base can take
     * a while to fan out and the operator should not wait on it.
     */
    @Async
    public void broadcastAsync(String releaseId, String triggerSource, String operator) {
        try {
            broadcast(releaseId, triggerSource, operator);
        } catch (Exception ex) {
            log.warn("App version broadcast failed releaseId={}: {}", releaseId, ex.getMessage());
        }
    }

    public int broadcast(String releaseId, String triggerSource, String operator) {
        if (!pushEnabled) {
            log.info("App version push disabled, skip releaseId={}", releaseId);
            return 0;
        }
        AppVersionReleaseService.Release release = appVersionReleaseService.get(releaseId);
        if (!AppVersionReleaseService.STATUS_PUBLISHED.equals(release.status())) {
            log.warn("Refuse to push unpublished release id={} status={}", releaseId, release.status());
            return 0;
        }
        String title = resolveTitle(release);
        String body = resolveBody(release);
        String refId = String.valueOf(release.versionCode());

        int total = 0;
        int offset = 0;
        while (true) {
            List<UserPushTokenService.PushTarget> targets =
                    userPushTokenService.listTargetsByPlatformAndChannel(
                            release.platform(), release.channel(), offset, PAGE_SIZE);
            if (targets.isEmpty()) {
                break;
            }
            total += dispatchPage(targets, title, body, refId);
            if (targets.size() < PAGE_SIZE) {
                break;
            }
            offset += PAGE_SIZE;
        }
        appVersionReleaseService.recordPush(releaseId, triggerSource, operator, total);
        log.info("App version broadcast releaseId={} versionCode={} targets={}", releaseId, release.versionCode(), total);
        return total;
    }

    private int dispatchPage(
            List<UserPushTokenService.PushTarget> targets,
            String title,
            String body,
            String refId
    ) {
        List<ExpoPushNotificationService.PushMessage> messages = new ArrayList<>(targets.size());
        List<Object[]> notificationRows = new ArrayList<>(targets.size());
        Timestamp now = Timestamp.valueOf(LocalDateTime.now());
        for (UserPushTokenService.PushTarget target : targets) {
            // Update notices intentionally bypass the marketing preference gate: an outdated client
            // can break against a newer API, so this is treated as a system message.
            messages.add(new ExpoPushNotificationService.PushMessage(
                    target.userId(),
                    title,
                    body,
                    CATEGORY,
                    refId,
                    target.expoPushToken()
            ));
            notificationRows.add(new Object[]{
                    IdUtil.fastSimpleUUID(),
                    target.userId(),
                    CATEGORY,
                    title,
                    body,
                    refId,
                    now
            });
        }
        jdbcTemplate.batchUpdate(
                """
                        INSERT INTO user_notification (id, user_id, category, title, body, ref_id, read_flag, created_time)
                        VALUES (?,?,?,?,?,?,0,?)
                        """,
                notificationRows
        );
        expoPushNotificationService.sendBatch(messages);
        return messages.size();
    }

    private static String resolveTitle(AppVersionReleaseService.Release release) {
        if (!release.pushTitle().isBlank()) {
            return release.pushTitle();
        }
        String versionName = release.versionName().isBlank()
                ? String.valueOf(release.versionCode())
                : release.versionName();
        return "新版本 " + versionName + " 已发布";
    }

    private static String resolveBody(AppVersionReleaseService.Release release) {
        if (!release.pushBody().isBlank()) {
            return release.pushBody();
        }
        if (!release.releaseNotes().isBlank()) {
            return release.releaseNotes();
        }
        return "点击查看并升级到最新版本，获得更稳定的开箱体验。";
    }
}
