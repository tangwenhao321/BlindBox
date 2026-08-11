package io.github.qifan777.server.marketplace.job;

import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import io.github.qifan777.server.marketplace.MarketplaceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class MarketplaceCoolingJob {
    private final MarketplaceService marketplaceService;
    private final JobRunAuditService jobRunAuditService;

    @Scheduled(cron = "${app.jobs.marketplace-cooling-cron:0 15 * * * ?}")
    @SchedulerLock(name = "MarketplaceCoolingJob", lockAtLeastFor = "PT1M", lockAtMostFor = "PT30M")
    public void settleCoolingTrades() {
        jobRunAuditService.runWithAudit("MarketplaceCoolingJob", () -> {
            int settled = 0;
            for (String tradeId : marketplaceService.listExpiredCoolingTradeIds(50)) {
                try {
                    marketplaceService.settleTrade(tradeId);
                    settled++;
                } catch (Exception ex) {
                    log.warn("Failed to settle marketplace trade {}", tradeId, ex);
                }
            }
            log.info("MarketplaceCoolingJob settled {} trades", settled);
            return settled;
        });
    }
}
