package io.github.qifan777.server.box.order.job;

import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.metrics.DrawIntegrityMetrics;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.order.service.OrderDrawIntegrityService;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.infrastructure.audit.AuditTrailService;
import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import io.github.qifan777.server.payment.service.PaymentReliabilityService;
import io.github.qifan777.server.refund.service.RefundRecordService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 定时扫描近期已支付订单的开奖数量与封面完整性；
 * claimPaid 空奖品 TO_BE_DELIVERED 超时登记 DRAW_INTEGRITY_EMPTY 退款工单（不自动入账）。
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OrderDrawIntegrityReconciliationJob {

    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final OrderDrawIntegrityService orderDrawIntegrityService;
    private final AuditTrailService auditTrailService;
    private final JobRunAuditService jobRunAuditService;
    private final DrawIntegrityMetrics drawIntegrityMetrics;
    private final PaymentReliabilityService paymentReliabilityService;
    private final RefundRecordService refundRecordService;

    @Value("${app.jobs.draw-integrity.enabled:true}")
    private boolean enabled;

    @Value("${app.jobs.draw-integrity.lookback-hours:24}")
    private int lookbackHours;

    @Value("${app.jobs.draw-integrity.batch-size:200}")
    private int batchSize;

    @Value("${app.jobs.draw-integrity.empty-repair-min-age-minutes:15}")
    private int emptyRepairMinAgeMinutes;

    @Scheduled(cron = "${app.jobs.draw-integrity.cron:0 30 4 * * ?}")
    @SchedulerLock(name = "OrderDrawIntegrityReconciliationJob", lockAtLeastFor = "PT2M", lockAtMostFor = "PT30M")
    public void reconcileRecentPaidOrders() {
        if (!enabled) {
            return;
        }
        jobRunAuditService.runWithAudit("OrderDrawIntegrityReconciliationJob", () -> {
        LocalDateTime since = LocalDateTime.now().minusHours(Math.max(1, lookbackHours));
        int limit = Math.min(Math.max(batchSize, 1), 500);
        List<String> orderIds = mysteryBoxOrderRepository.findRecentlyPaidOrderIds(since, limit);
        if (orderIds.isEmpty()) {
            return;
        }

        List<String> failedOrderIds = new ArrayList<>();
        int emptyTickets = 0;
        LocalDateTime emptyAgeThreshold = LocalDateTime.now()
                .minusMinutes(Math.max(5, emptyRepairMinAgeMinutes));
        for (String orderId : orderIds) {
            try {
                MysteryBoxOrder order = mysteryBoxOrderRepository
                        .findById(orderId, MysteryBoxOrderRepository.COMPLEX_FETCHER_FOR_FRONT)
                        .orElse(null);
                if (order == null) {
                    continue;
                }
                OrderDrawIntegrityService.OrderDrawIntegrityView view = orderDrawIntegrityService.check(order);
                if (!view.ok()) {
                    failedOrderIds.add(orderId);
                    drawIntegrityMetrics.integrityMismatch();
                    log.warn("draw integrity mismatch orderId={} message={}", orderId, view.message());
                    emptyTickets += maybeCreateEmptyPrizeRefundTicket(order, view, emptyAgeThreshold);
                }
            } catch (Exception ex) {
                failedOrderIds.add(orderId);
                drawIntegrityMetrics.integrityMismatch();
                log.error("draw integrity scan failed orderId={}", orderId, ex);
            }
        }

        if (!failedOrderIds.isEmpty()) {
            auditTrailService.record(
                    "ORDER_DRAW_INTEGRITY_RECONCILE",
                    "system",
                    "mystery_box_order",
                    "*",
                    "",
                    Map.of(
                            "scanned", orderIds.size(),
                            "failed", failedOrderIds.size(),
                            "emptyTickets", emptyTickets,
                            "sampleOrderIds", failedOrderIds.stream().limit(20).toList()
                    )
            );
            log.info(
                    "draw integrity reconciliation done scanned={} failed={} emptyTickets={}",
                    orderIds.size(),
                    failedOrderIds.size(),
                    emptyTickets
            );
        } else {
            log.debug("draw integrity reconciliation ok scanned={}", orderIds.size());
        }
        });
    }

    /**
     * TO_BE_DELIVERED + expected draws &gt; 0 + zero prizes + age &gt; N → metric/event + REFUNDING ticket.
     */
    private int maybeCreateEmptyPrizeRefundTicket(
            MysteryBoxOrder order,
            OrderDrawIntegrityService.OrderDrawIntegrityView view,
            LocalDateTime emptyAgeThreshold
    ) {
        if (order.status() != DictConstants.ProductOrderStatus.TO_BE_DELIVERED) {
            return 0;
        }
        if (view.expectedDrawCount() <= 0 || view.actualPrizeCount() != 0) {
            return 0;
        }
        LocalDateTime ageAnchor = order.editedTime() != null ? order.editedTime() : order.createdTime();
        if (ageAnchor == null || !ageAnchor.isBefore(emptyAgeThreshold)) {
            return 0;
        }
        String userId = order.creator() == null ? "" : order.creator().id();
        log.error(
                "draw_integrity_empty orderId={} expected={} actual={} ageAnchor={}",
                order.id(),
                view.expectedDrawCount(),
                view.actualPrizeCount(),
                ageAnchor
        );
        paymentReliabilityService.recordPaymentEvent(
                userId,
                order.id(),
                "draw_integrity_empty",
                "alert",
                view.message() == null ? "" : view.message(),
                0
        );
        return refundRecordService.createDrawIntegrityEmptyRefundIfAbsent(order).isPresent() ? 1 : 0;
    }
}
