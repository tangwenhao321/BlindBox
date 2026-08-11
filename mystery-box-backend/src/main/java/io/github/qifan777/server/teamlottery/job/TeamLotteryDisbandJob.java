package io.github.qifan777.server.teamlottery.job;

import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import io.github.qifan777.server.teamlottery.TeamLotteryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class TeamLotteryDisbandJob {
    private final TeamLotteryService teamLotteryService;
    private final JobRunAuditService jobRunAuditService;

    @Scheduled(cron = "${app.jobs.team-lottery-disband-cron:0 30 * * * ?}")
    @SchedulerLock(name = "TeamLotteryDisbandJob", lockAtLeastFor = "PT1M", lockAtMostFor = "PT20M")
    public void disbandExpired() {
        jobRunAuditService.runWithAudit("TeamLotteryDisbandJob", () -> {
            int count = teamLotteryService.disbandExpiredTeams(50);
            log.info("TeamLotteryDisbandJob disbanded {} teams", count);
            return count;
        });
    }
}
