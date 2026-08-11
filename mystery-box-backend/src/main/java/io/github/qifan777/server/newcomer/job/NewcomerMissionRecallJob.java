package io.github.qifan777.server.newcomer.job;

import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import io.github.qifan777.server.notification.service.ExpoPushNotificationService;
import io.github.qifan777.server.notification.service.UserNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class NewcomerMissionRecallJob {
    private static final Duration DEDUPE_TTL = Duration.ofDays(2);

    private final JdbcTemplate jdbcTemplate;
    private final StringRedisTemplate redisTemplate;
    private final UserNotificationService userNotificationService;
    private final ExpoPushNotificationService expoPushNotificationService;
    private final JobRunAuditService jobRunAuditService;

    @Scheduled(cron = "${app.jobs.newcomer-recall-cron:0 0 10 * * ?}")
    @SchedulerLock(name = "NewcomerMissionRecallJob", lockAtLeastFor = "PT5M", lockAtMostFor = "PT30M")
    public void recallUnclaimedMissions() {
        jobRunAuditService.runWithAudit("NewcomerMissionRecallJob", () -> {
            List<String> userIds = jdbcTemplate.queryForList(
                    """
                            SELECT DISTINCT m.user_id
                            FROM user_newcomer_mission m
                            INNER JOIN user u ON u.id = m.user_id
                            WHERE m.claimed = 0
                              AND m.day_index <= LEAST(
                                    7,
                                    GREATEST(1, DATEDIFF(CURDATE(), DATE(u.created_time)) + 1)
                              )
                              AND u.created_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                            LIMIT 500
                            """,
                    String.class
            );
            List<ExpoPushNotificationService.PushMessage> batch = new ArrayList<>();
            int sent = 0;
            for (String userId : userIds) {
                String dedupeKey = "job:newcomer-recall:" + userId + ":" + LocalDate.now();
                Boolean fresh = redisTemplate.opsForValue().setIfAbsent(dedupeKey, "1", DEDUPE_TTL);
                if (!Boolean.TRUE.equals(fresh)) {
                    continue;
                }
                String title = "新人任务待领取";
                String body = "您有未完成的新人奖励，快来领取吧";
                userNotificationService.persist(userId, "NEWCOMER_RECALL", title, body, userId);
                batch.addAll(userNotificationService.preparePushMessages(userId, "NEWCOMER_RECALL", title, body, userId));
                sent++;
            }
            if (!batch.isEmpty()) {
                expoPushNotificationService.sendBatch(batch);
            }
            log.info("Newcomer mission recall sent to {} users", sent);
        });
    }
}
