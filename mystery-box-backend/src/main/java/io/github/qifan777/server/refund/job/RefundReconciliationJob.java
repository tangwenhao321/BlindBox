package io.github.qifan777.server.refund.job;

import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import io.github.qifan777.server.payment.service.PaymentReliabilityService;
import io.github.qifan777.server.refund.entity.RefundRecord;
import io.github.qifan777.server.refund.metrics.RefundReconcileMetrics;
import io.github.qifan777.server.refund.repository.RefundRecordRepository;
import io.github.qifan777.server.refund.service.RefundRecordService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scan stuck REFUNDING rows and retry finalize (mock/balance/VNPay/WeChat query).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RefundReconciliationJob {
    private final RefundRecordRepository refundRecordRepository;
    private final RefundRecordService refundRecordService;
    private final PaymentReliabilityService paymentReliabilityService;
    private final JobRunAuditService jobRunAuditService;
    private final RefundReconcileMetrics refundReconcileMetrics;

    @Value("${app.jobs.refund-reconcile.enabled:true}")
    private boolean enabled;

    @Value("${app.jobs.refund-reconcile.min-age-minutes:10}")
    private int minAgeMinutes;

    @Value("${app.jobs.refund-reconcile.batch-size:50}")
    private int batchSize;

    @Scheduled(cron = "${app.jobs.refund-reconcile.cron:0 */7 * * * ?}")
    @SchedulerLock(name = "RefundReconciliationJob", lockAtLeastFor = "PT1M", lockAtMostFor = "PT10M")
    public void reconcileStuckRefunding() {
        if (!enabled) {
            return;
        }
        jobRunAuditService.runWithAudit("RefundReconciliationJob", () -> {
            LocalDateTime threshold = LocalDateTime.now().minusMinutes(Math.max(5, minAgeMinutes));
            List<RefundRecord> candidates = refundRecordRepository.findStuckRefunding(
                    threshold, Math.min(Math.max(batchSize, 1), 200));
            int repaired = 0;
            for (RefundRecord record : candidates) {
                refundReconcileMetrics.scanned();
                try {
                    if (refundRecordService.retryStuckRefunding(record.id())) {
                        repaired++;
                        refundReconcileMetrics.repaired();
                    } else if (!isDrawIntegrityTicket(record)) {
                        refundReconcileMetrics.stillStuck();
                    }
                } catch (Exception ex) {
                    refundReconcileMetrics.failed();
                    paymentReliabilityService.recordPaymentEvent(
                            record.creator() == null ? "" : record.creator().id(),
                            record.orderId(),
                            "refund_reconcile",
                            "fail",
                            ex.getMessage() == null ? "" : ex.getMessage(),
                            0
                    );
                    log.warn("refund reconcile failed refundId={} orderId={}", record.id(), record.orderId(), ex);
                }
            }
            if (repaired > 0 || !candidates.isEmpty()) {
                log.info("refund reconciliation finished repaired={} scanned={}", repaired, candidates.size());
            }
        });
    }

    private static boolean isDrawIntegrityTicket(RefundRecord record) {
        return record != null
                && record.reason() != null
                && record.reason().contains(RefundRecordService.DRAW_INTEGRITY_EMPTY_REASON);
    }
}
