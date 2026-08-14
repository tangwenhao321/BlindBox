package io.github.qifan777.server.box.order.job;

import io.github.qifan777.server.dict.model.PayType;

import com.github.binarywang.wxpay.bean.result.WxPayOrderQueryV3Result;
import com.github.binarywang.wxpay.service.WxPayService;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.order.service.MysteryBoxOrderService;
import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import io.github.qifan777.server.infrastructure.money.MoneyRounding;
import io.github.qifan777.server.payment.gateway.PaymentNotifyResult;
import io.github.qifan777.server.payment.gateway.VNPayPaymentGateway;
import io.github.qifan777.server.payment.service.PaymentReliabilityService;
import io.github.qifan777.server.vip.order.entity.VipOrder;
import io.github.qifan777.server.vip.order.repository.VipOrderRepository;
import io.github.qifan777.server.vip.order.service.VipOrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentReconciliationJob {
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final MysteryBoxOrderService mysteryBoxOrderService;
    private final VipOrderRepository vipOrderRepository;
    private final VipOrderService vipOrderService;
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
            int repaired = reconcileMysteryBoxOrders(threshold)
                    + reconcileVipOrders(threshold);
            if (repaired > 0) {
                log.info("payment reconciliation finished repaired={}", repaired);
            }
        });
    }

    private int reconcileMysteryBoxOrders(LocalDateTime threshold) {
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
                    LocalDateTime preferredTxnTime = preferredVnPayTxnTime(
                            order.baseOrder().payment().payTime(), order.createdTime());
                    var paid = vnpayPaymentGateway.queryPaid(order.id(), "127.0.0.1", preferredTxnTime);
                    if (paid.isPresent()) {
                        PaymentNotifyResult result = paid.get();
                        if (result.amountMinor() == null) {
                            log.warn("vnpay reconcile skip without amount orderId={}", order.id());
                            continue;
                        }
                        var payAmount = order.baseOrder().payment().payAmount();
                        if (!vnpayPaymentGateway.matchesPayAmount(result.amountMinor(), payAmount)) {
                            log.warn(
                                    "vnpay reconcile amount mismatch orderId={} amountMinor={} payAmount={}",
                                    order.id(),
                                    result.amountMinor(),
                                    payAmount
                            );
                            continue;
                        }
                        mysteryBoxOrderService.reconcilePayment(result.orderId(), result.transactionId(), "reconcile");
                        repaired++;
                        log.info("vnpay reconcile repaired orderId={}", order.id());
                    }
                    continue;
                }
                if (payType == PayType.MO_MO) {
                    log.debug("MoMo reconcile stub skip orderId={} (Partner query not wired)", order.id());
                    continue;
                }
                if (tryReconcileWeChat(order.id(), order.baseOrder().payment().payAmount(),
                        creatorId -> mysteryBoxOrderService.reconcilePayment(order.id(), creatorId, "reconcile"))) {
                    repaired++;
                }
            } catch (Exception ex) {
                String creatorId = order.creator() != null ? order.creator().id() : null;
                paymentReliabilityService.recordPaymentEvent(
                        creatorId,
                        order.id(),
                        "reconcile",
                        "fail",
                        ex.getMessage(),
                        0
                );
                log.warn("payment reconcile failed orderId={}", order.id(), ex);
            }
        }
        return repaired;
    }

    private int reconcileVipOrders(LocalDateTime threshold) {
        List<VipOrder> candidates = vipOrderRepository.findUnpaidOrdersBatch(
                Math.min(Math.max(batchSize, 1), 200));
        candidates = candidates.stream()
                .filter(order -> order.createdTime() != null && order.createdTime().isBefore(threshold))
                .toList();
        int repaired = 0;
        for (VipOrder order : candidates) {
            try {
                PayType payType = order.baseOrder().payment().payType();
                if (payType == PayType.VN_PAY) {
                    LocalDateTime preferredTxnTime = preferredVnPayTxnTime(
                            order.baseOrder().payment().payTime(), order.createdTime());
                    var paid = vnpayPaymentGateway.queryPaid(order.id(), "127.0.0.1", preferredTxnTime);
                    if (paid.isEmpty()) {
                        continue;
                    }
                    PaymentNotifyResult result = paid.get();
                    if (result.amountMinor() == null
                            || !vnpayPaymentGateway.matchesPayAmount(
                            result.amountMinor(), order.baseOrder().payment().payAmount())) {
                        log.warn("vip vnpay reconcile amount skip orderId={}", order.id());
                        continue;
                    }
                    vipOrderService.reconcilePayment(result.orderId(), result.transactionId());
                    repaired++;
                    log.info("vip vnpay reconcile repaired orderId={}", order.id());
                    continue;
                }
                if (payType == PayType.MO_MO) {
                    continue;
                }
                if (tryReconcileWeChat(order.id(), order.baseOrder().payment().payAmount(),
                        txn -> vipOrderService.reconcilePayment(order.id(), txn))) {
                    repaired++;
                    log.info("vip wechat reconcile repaired orderId={}", order.id());
                }
            } catch (Exception ex) {
                log.warn("vip payment reconcile failed orderId={}", order.id(), ex);
            }
        }
        return repaired;
    }

    private boolean tryReconcileWeChat(String orderId, BigDecimal payAmount, java.util.function.Consumer<String> onPaid)
            throws Exception {
        WxPayOrderQueryV3Result query = wxPayService.queryOrderV3(null, orderId);
        if (query == null || !StringUtils.hasText(query.getTradeState())) {
            return false;
        }
        if (!"SUCCESS".equalsIgnoreCase(query.getTradeState())) {
            return false;
        }
        Integer totalFen = query.getAmount() != null ? query.getAmount().getTotal() : null;
        if (totalFen == null) {
            log.warn("wechat reconcile skip without amount orderId={}", orderId);
            return false;
        }
        if (payAmount == null || !MoneyRounding.matchesGatewayMinor(totalFen.longValue(), payAmount)) {
            log.warn("wechat reconcile amount mismatch orderId={} totalFen={} payAmount={}",
                    orderId, totalFen, payAmount);
            return false;
        }
        String transactionId = StringUtils.hasText(query.getTransactionId())
                ? query.getTransactionId()
                : orderId;
        onPaid.accept(transactionId);
        return true;
    }

    private static LocalDateTime preferredVnPayTxnTime(LocalDateTime payTime, LocalDateTime createdTime) {
        return payTime != null ? payTime : createdTime;
    }
}
