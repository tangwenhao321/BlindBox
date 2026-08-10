package io.github.qifan777.server.box.slot.job;

import io.github.qifan777.server.box.slot.service.MysteryBoxPoolSlotService;
import io.github.qifan777.server.infrastructure.audit.AuditTrailService;
import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class PoolSlotReconciliationJob {
    private final MysteryBoxPoolSlotService mysteryBoxPoolSlotService;
    private final AuditTrailService auditTrailService;
    private final JobRunAuditService jobRunAuditService;

    @Value("${app.pool.reconcile.auto-fix:false}")
    private boolean autoFix;

    @Scheduled(cron = "0 */15 * * * ?")
    @SchedulerLock(name = "PoolSlotReconciliationJob", lockAtLeastFor = "PT2M", lockAtMostFor = "PT30M")
    public void reconcilePoolSlots() {
        jobRunAuditService.runWithAudit("PoolSlotReconciliationJob", () -> {
            MysteryBoxPoolSlotService.ReconcileResult result = mysteryBoxPoolSlotService.reconcile();
            int repaired = 0;
            if (autoFix && !result.mismatches().isEmpty()) {
                repaired = mysteryBoxPoolSlotService.repairMismatches(result.mismatches());
                log.warn("pool slot reconciliation auto-fix repaired {} boxes", repaired);
            }
            if (!result.mismatches().isEmpty()) {
                auditTrailService.record(
                        "POOL_SLOT_RECONCILE_MISMATCH",
                        "system",
                        "mystery_box_pool_slot",
                        "*",
                        "",
                        mysteryBoxPoolSlotService.reconcileAuditPayload(result)
                );
            }
            log.info(
                    "pool slot reconciliation done expiredReservations={} mismatches={} repaired={}",
                    result.expiredReservations(),
                    result.mismatches().size(),
                    repaired
            );
        });
    }
}
