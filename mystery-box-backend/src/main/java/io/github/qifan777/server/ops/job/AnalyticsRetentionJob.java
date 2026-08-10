package io.github.qifan777.server.ops.job;

import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Purges analytics_event rows older than {@code security.analytics.retention-days}.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AnalyticsRetentionJob {
    private static final int DELETE_BATCH_SIZE = 5000;

    private final JdbcTemplate jdbcTemplate;
    private final JobRunAuditService jobRunAuditService;

    @Value("${security.analytics.retention-days:30}")
    private int retentionDays;

    @Value("${security.analytics.retention-enabled:true}")
    private boolean enabled;

    @Scheduled(cron = "${security.analytics.retention-cron:0 15 3 * * ?}")
    @SchedulerLock(name = "AnalyticsRetentionJob", lockAtLeastFor = "PT2M", lockAtMostFor = "PT30M")
    public void purgeExpiredEvents() {
        if (!enabled || retentionDays <= 0) {
            return;
        }
        jobRunAuditService.runWithAudit("AnalyticsRetentionJob", () -> {
            int totalDeleted = 0;
            int deleted;
            do {
                deleted = jdbcTemplate.update(
                        "DELETE FROM analytics_event WHERE event_at < DATE_SUB(NOW(), INTERVAL ? DAY) LIMIT ?",
                        retentionDays,
                        DELETE_BATCH_SIZE
                );
                totalDeleted += deleted;
            } while (deleted >= DELETE_BATCH_SIZE);
            if (totalDeleted > 0) {
                log.info("analytics retention purge deleted={} retentionDays={}", totalDeleted, retentionDays);
            }
        });
    }
}
