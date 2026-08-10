package io.github.qifan777.server.box.order.job;

import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.order.service.OrderDrawIntegrityService;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.infrastructure.audit.AuditTrailService;
import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
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
 * 定时扫描近期已支付订单的开奖数量与封面完整性。
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OrderDrawIntegrityReconciliationJob {

    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final OrderDrawIntegrityService orderDrawIntegrityService;
    private final AuditTrailService auditTrailService;
    private final JobRunAuditService jobRunAuditService;

    @Value("${app.jobs.draw-integrity.enabled:true}")
    private boolean enabled;

    @Value("${app.jobs.draw-integrity.lookback-hours:24}")
    private int lookbackHours;

    @Value("${app.jobs.draw-integrity.batch-size:200}")
    private int batchSize;

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
                    log.warn("draw integrity mismatch orderId={} message={}", orderId, view.message());
                }
            } catch (Exception ex) {
                failedOrderIds.add(orderId);
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
                            "sampleOrderIds", failedOrderIds.stream().limit(20).toList()
                    )
            );
            log.info(
                    "draw integrity reconciliation done scanned={} failed={}",
                    orderIds.size(),
                    failedOrderIds.size()
            );
        } else {
            log.debug("draw integrity reconciliation ok scanned={}", orderIds.size());
        }
        });
    }
}
