package io.github.qifan777.server.box.slot.job;

import io.github.qifan777.server.box.slot.service.MysteryBoxPoolSlotService;
import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class PoolSlotExpireReservationsJob {
    private final MysteryBoxPoolSlotService mysteryBoxPoolSlotService;
    private final JobRunAuditService jobRunAuditService;

    @Scheduled(fixedDelayString = "${app.jobs.pool-slot-expire-ms:60000}")
    @SchedulerLock(name = "PoolSlotExpireReservationsJob", lockAtLeastFor = "PT30S", lockAtMostFor = "PT5M")
    public void expireStaleReservations() {
        jobRunAuditService.runWithAudit("PoolSlotExpireReservationsJob", () -> {
            int expired = mysteryBoxPoolSlotService.expireAllStaleReservations();
            if (expired > 0) {
                log.info("Expired {} stale pool slot reservations", expired);
            }
        });
    }
}
