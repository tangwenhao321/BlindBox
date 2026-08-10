package io.github.qifan777.server.leaderboard.job;

import io.github.qifan777.server.leaderboard.service.DrawLeaderboardService;
import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DrawLeaderboardWarmupJob {

    private final JdbcTemplate jdbcTemplate;
    private final DrawLeaderboardService drawLeaderboardService;
    private final JobRunAuditService jobRunAuditService;

    @Scheduled(fixedDelayString = "${leaderboard.warmup.delay-ms:300000}")
    @SchedulerLock(name = "DrawLeaderboardWarmupJob", lockAtLeastFor = "PT1M", lockAtMostFor = "PT15M")
    public void warmupWeeklyLeaderboards() {
        jobRunAuditService.runWithAudit("DrawLeaderboardWarmupJob", () -> {
        List<String> boxIds;
        try {
            boxIds = jdbcTemplate.queryForList(
                    "SELECT id FROM mystery_box ORDER BY edited_time DESC LIMIT 20",
                    String.class
            );
        } catch (Exception e) {
            log.debug("Leaderboard warmup skipped: {}", e.getMessage());
            return null;
        }
        drawLeaderboardService.page(null, "week", 0, 20);
        for (String boxId : boxIds) {
            drawLeaderboardService.page(boxId, "week", 0, 20);
        }
        log.trace("Leaderboard warmup finished for {} boxes", boxIds.size());
        return null;
        });
    }
}
