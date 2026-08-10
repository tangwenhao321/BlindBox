package io.github.qifan777.server.ops.service;

import io.github.qifan777.server.infrastructure.audit.AuditTrailService;
import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class OpsAutomationScheduler {
    private final JdbcTemplate jdbcTemplate;
    private final AuditTrailService auditTrailService;
    private final JobRunAuditService jobRunAuditService;

    @Scheduled(cron = "0 */30 * * * *")
    @SchedulerLock(name = "OpsAutomationScheduler", lockAtLeastFor = "PT1M", lockAtMostFor = "PT15M")
    public void autoProgressCampaigns() {
        jobRunAuditService.runWithAudit("OpsAutomationScheduler", () -> {
        int preheat = jdbcTemplate.update(
                "UPDATE ops_campaign SET status = 'PREHEAT', edited_time = NOW() WHERE status = 'DRAFT' AND created_time <= DATE_SUB(NOW(), INTERVAL 1 DAY)"
        );
        int online = jdbcTemplate.update(
                "UPDATE ops_campaign SET status = 'ONLINE', edited_time = NOW() WHERE status = 'PREHEAT' AND edited_time <= DATE_SUB(NOW(), INTERVAL 1 DAY)"
        );
        if (preheat > 0 || online > 0) {
            auditTrailService.record("OPS_CAMPAIGN_AUTOMATION", "system", "campaign", "*", "", Map.of("preheat", preheat, "online", online));
            log.info("campaign automation applied, preheat={}, online={}", preheat, online);
        }
        });
    }
}
