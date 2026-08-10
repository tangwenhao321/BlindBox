package io.github.qifan777.server.box.order.job;

import com.github.binarywang.wxpay.bean.result.WxPayOrderQueryV3Result;
import com.github.binarywang.wxpay.service.WxPayService;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.order.service.MysteryBoxOrderService;
import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import io.github.qifan777.server.payment.service.PaymentReliabilityService;
import io.github.qifan777.server.payment.gateway.PaymentNotifyResult;
import io.github.qifan777.server.payment.gateway.VNPayPaymentGateway;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

import static io.github.qifan777.server.dict.model.DictConstants.PayType;

@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentReconciliationJob {
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final MysteryBoxOrderService mysteryBoxOrderService;
    private final WxPayService wxPayService;
    private final VNPayPaymentGateway vnpayPaymentGateway;
    private final PaymentReliabilityService paymentReliabilityService;
    private final JobRunAuditService jobRunAuditService;

    @Value("${payment.mock-enabled:false}")
    private boolean mockPaymentEnabled;

    @Value("${app.jobs.payment-reconcile.min-age-minutes:10}")
    private int minAgeMinutes;

    @Value("${app.jobs.payment-reconcile.batch-size:50}")
    private int batchSize;

    @Scheduled(cron = "${app.jobs.payment-reconcile.cron:0 */5 * * * ?}")
    @SchedulerLock(name = "PaymentReconciliationJob", lockAtLeastFor = "PT1M", lockAtMostFor = "PT10M")
    public void reconcileStuckUnpaidOrders() {
        if (mockPaymentEnabled) {
            return;
        }
        jobRunAuditService.runWithAudit("PaymentReconciliationJob", () -> {
            LocalDateTime threshold = LocalDateTime.now().minusMinutes(Math.max(5, minAgeMinutes));
            List<MysteryBoxOrder> candidates = mysteryBoxOrderRepository.findUnpaidOrdersBatch(
                    Math.min(Math.max(batchSize, 1), 200));
            candidates = candidates.stream()
                    .filter(order -> order.createdTime() != null && order.createdTime().isBefore(threshold))
                    .toList();
            int repaired = 0;
            for (MysteryBoxOrder order : candidates) {
                try {
                    PayType payType = order.baseOrder().payment().payType();
                    if (payType == PayType.VN_PAY) {
                        var paid = vnpayPaymentGateway.queryPaid(order.id());
                        if (paid.isPresent()) {
                            PaymentNotifyResult result = paid.get();
                            mysteryBoxOrderService.reconcilePayment(result.orderId(), result.transactionId(), "reconcile");
                            repaired++;
                            log.info("vnpay reconcile repaired orderId={}", order.id());
                        }
                        continue;
                    }
                    WxPayOrderQueryV3Result query = wxPayService.queryOrderV3(null, order.id());
                    if (query == null || !StringUtils.hasText(query.getTradeState())) {
                        continue;
                    }
                    if ("SUCCESS".equalsIgnoreCase(query.getTradeState())) {
                        String transactionId = StringUtils.hasText(query.getTransactionId())
                                ? query.getTransactionId()
                                : order.id();
                        mysteryBoxOrderService.reconcilePayment(order.id(), transactionId, "reconcile");
                        repaired++;
                        log.info("payment reconcile repaired orderId={} transactionId={}", order.id(), transactionId);
                    }
                } catch (Exception ex) {
                    paymentReliabilityService.recordPaymentEvent(
                            order.creator().id(),
                            order.id(),
                            "reconcile",
                            "fail",
                            ex.getMessage(),
                            0
                    );
                    log.warn("payment reconcile failed orderId={}", order.id(), ex);
                }
            }
            if (repaired > 0) {
                log.info("payment reconciliation finished repaired={} scanned={}", repaired, candidates.size());
            }
        });
    }
}
