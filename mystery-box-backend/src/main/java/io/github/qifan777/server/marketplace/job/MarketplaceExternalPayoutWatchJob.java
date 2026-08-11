package io.github.qifan777.server.marketplace.job;

import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import io.github.qifan777.server.marketplace.MarketplaceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Fails aged PENDING_EXTERNAL marketplace trades (refund buyer, restore listing).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MarketplaceExternalPayoutWatchJob {
    private final MarketplaceService marketplaceService;
    private final JobRunAuditService jobRunAuditService;

    @Scheduled(cron = "${app.jobs.marketplace-external-payout-watch-cron:0 45 * * * ?}")
    @SchedulerLock(name = "MarketplaceExternalPayoutWatchJob", lockAtLeastFor = "PT1M", lockAtMostFor = "PT30M")
    public void failAgedPendingExternal() {
        jobRunAuditService.runWithAudit("MarketplaceExternalPayoutWatchJob", () -> {
            int failed = 0;
            for (String tradeId : marketplaceService.listAgedPendingExternalTradeIds(50)) {
                try {
                    marketplaceService.failExternalPayout(tradeId, true);
                    failed++;
                } catch (Exception ex) {
                    log.warn("Failed to auto-fail PENDING_EXTERNAL trade {}", tradeId, ex);
                }
            }
            log.info("MarketplaceExternalPayoutWatchJob failed {} aged PENDING_EXTERNAL trades", failed);
            return failed;
        });
    }
}
