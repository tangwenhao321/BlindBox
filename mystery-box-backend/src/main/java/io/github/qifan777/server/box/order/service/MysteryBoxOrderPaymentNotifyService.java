package io.github.qifan777.server.box.order.service;

import io.github.qifan777.server.dict.model.ProductOrderStatus;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.IdUtil;
import com.github.binarywang.wxpay.bean.notify.SignatureHeader;
import com.github.binarywang.wxpay.bean.notify.WxPayNotifyV3Result;
import com.github.binarywang.wxpay.service.WxPayService;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.pity.service.MysteryBoxUserPityService;
import io.github.qifan777.server.box.product.service.PrizeStockService;
import io.github.qifan777.server.logistics.service.OrderLogisticsService;
import io.github.qifan777.server.notification.service.UserNotificationService;
import io.github.qifan777.server.payment.gateway.MoMoPaymentGateway;
import io.github.qifan777.server.payment.gateway.PaymentNotifyResult;
import io.github.qifan777.server.payment.gateway.VNPayPaymentGateway;
import io.github.qifan777.server.payment.metrics.PaymentMetrics;
import io.github.qifan777.server.payment.repository.PaymentRepository;
import io.github.qifan777.server.payment.service.PaymentNotifyLogService;
import io.github.qifan777.server.payment.service.PaymentReliabilityService;
import io.github.qifan777.server.referral.service.ReferralService;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MysteryBoxOrderPaymentNotifyService {
    private static final String WECHAT_NOTIFY_SUCCESS = "{\"code\":\"SUCCESS\",\"message\":\"成功\"}";
    private static final String VNPAY_NOTIFY_SUCCESS = "RspCode=00&Message=Confirm";

    private final WxPayService wxPayService;
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentReliabilityService paymentReliabilityService;
    private final PaymentNotifyLogService paymentNotifyLogService;
    private final PrizeStockService prizeStockService;
    private final MysteryBoxUserPityService mysteryBoxUserPityService;
    private final OrderLogisticsService orderLogisticsService;
    private final UserNotificationService userNotificationService;
    private final ReferralService referralService;
    private final PaymentRetentionService paymentRetentionService;
    private final PaymentMetrics paymentMetrics;
    private final VNPayPaymentGateway vnpayPaymentGateway;
    private final MoMoPaymentGateway momoPaymentGateway;
    private final MysteryBoxOrderDrawService drawService;
    private final MysteryBoxOrderRefundService refundService;
    private final MysteryBoxOrderPrepayService prepayService;

    @Transactional
    public String paymentNotifyVNPay(Map<String, String> params) {
        Optional<PaymentNotifyResult> parsed = vnpayPaymentGateway.parsePaymentNotify(null, params);
        if (parsed.isEmpty()) {
            paymentMetrics.paymentNotifyRejected();
            return "RspCode=97&Message=Invalid signature";
        }
        PaymentNotifyResult result = parsed.get();
        MysteryBoxOrder amountCheckOrder = mysteryBoxOrderRepository.findByIdForFront(result.orderId());
        BigDecimal currentPay = amountCheckOrder.baseOrder().payment().payAmount();
        if (!paymentRetentionService.matchesPayAmountAllowingStalePrepay(
                result.orderId(), result.amountMinor(), currentPay)) {
            log.warn("VNPay IPN amount mismatch orderId={} amountMinor={} payAmount={}",
                    result.orderId(), result.amountMinor(), currentPay);
            paymentMetrics.paymentNotifyRejected();
            return "RspCode=04&Message=Invalid amount";
        }
        if (paymentRetentionService.isStalePrepayOverpay(result.orderId(), result.amountMinor(), currentPay)) {
            BigDecimal claimed = paymentRetentionService.claimedDiscountRaw(result.orderId());
            BigDecimal gatewayPaid = currentPay.add(claimed);
            log.warn("VNPay stale prepay overpay reconciled orderId={} gatewayPaid={}", result.orderId(), gatewayPaid);
            paymentRetentionService.reconcileStaleOverpay(result.orderId(), gatewayPaid);
        }
        String body = params.toString();
        if (!paymentNotifyLogService.tryBegin(result.orderId(), result.transactionId(), "vnpay", body)) {
            log.info("重复 VNPay 回调已忽略 orderId={}", result.orderId());
            return VNPAY_NOTIFY_SUCCESS;
        }
        try {
            completeOrderAfterPayment(result.orderId(), result.transactionId(), "notify");
            paymentNotifyLogService.markProcessed(result.orderId(), "vnpay", body);
            paymentMetrics.paymentSuccess();
        } catch (Exception ex) {
            paymentMetrics.paymentFailure();
            paymentNotifyLogService.markFailed(result.orderId(), "vnpay");
            paymentReliabilityService.recordPaymentEvent(null, result.orderId(), "notify", "fail", ex.getMessage(), 0);
            throw ex;
        }
        return VNPAY_NOTIFY_SUCCESS;
    }

    @Transactional
    public String paymentNotifyMoMo(Map<String, String> params) {
        Optional<PaymentNotifyResult> parsed = momoPaymentGateway.parsePaymentNotify(null, params);
        if (parsed.isEmpty()) {
            paymentMetrics.paymentNotifyRejected();
            return "{\"resultCode\":1,\"message\":\"invalid\"}";
        }
        PaymentNotifyResult result = parsed.get();
        // Reject missing amount (align with WeChat) — null must not skip validation and complete the order.
        if (result.amountMinor() == null) {
            log.warn("MoMo notify missing amount orderId={}", result.orderId());
            paymentMetrics.paymentNotifyRejected();
            return "{\"resultCode\":1,\"message\":\"invalid amount\"}";
        }
        MysteryBoxOrder amountCheckOrder = mysteryBoxOrderRepository.findByIdForFront(result.orderId());
        BigDecimal currentPay = amountCheckOrder.baseOrder().payment().payAmount();
        if (!paymentRetentionService.matchesPayAmountAllowingStalePrepay(
                result.orderId(), result.amountMinor(), currentPay)) {
            paymentMetrics.paymentNotifyRejected();
            return "{\"resultCode\":1,\"message\":\"invalid amount\"}";
        }
        if (paymentRetentionService.isStalePrepayOverpay(result.orderId(), result.amountMinor(), currentPay)) {
            BigDecimal claimed = paymentRetentionService.claimedDiscountRaw(result.orderId());
            paymentRetentionService.reconcileStaleOverpay(result.orderId(), currentPay.add(claimed));
        }
        String body = params.toString();
        if (!paymentNotifyLogService.tryBegin(result.orderId(), result.transactionId(), "momo", body)) {
            log.info("重复 MoMo 回调已忽略 orderId={}", result.orderId());
            return "{\"resultCode\":0,\"message\":\"ok\"}";
        }
        try {
            completeOrderAfterPayment(result.orderId(), result.transactionId(), "notify");
            paymentNotifyLogService.markProcessed(result.orderId(), "momo", body);
            paymentMetrics.paymentSuccess();
        } catch (Exception ex) {
            paymentMetrics.paymentFailure();
            paymentNotifyLogService.markFailed(result.orderId(), "momo");
            paymentReliabilityService.recordPaymentEvent(null, result.orderId(), "notify", "fail", ex.getMessage(), 0);
            throw ex;
        }
        return "{\"resultCode\":0,\"message\":\"ok\"}";
    }

    /**
     * 支付成功回调
     * @param body 微信回调请求的body，带解密
     * @param signatureHeader 回调的请求头参数
     * @return 返回内容且http状态是200就代表成功，出现异常http状态会变成400，微信会认为回调失败，微信会轮询重试
     */
    @SneakyThrows
    @Transactional
    public String paymentNotifyWechat(String body, SignatureHeader signatureHeader) {
        WxPayNotifyV3Result.DecryptNotifyResult notifyResult = wxPayService.parseOrderNotifyV3Result(body, signatureHeader)
                .getResult();
        log.info("支付回调:{}", notifyResult);
        String outTradeNo = notifyResult.getOutTradeNo();
        String transactionId = notifyResult.getTransactionId();
        Long amountMinor = null;
        if (notifyResult.getAmount() != null && notifyResult.getAmount().getTotal() != null) {
            amountMinor = notifyResult.getAmount().getTotal().longValue();
        }
        if (amountMinor == null) {
            log.warn("WeChat notify missing amount orderId={}", outTradeNo);
            paymentMetrics.paymentNotifyRejected();
            throw new BusinessException("微信支付金额缺失");
        }
        MysteryBoxOrder amountCheckOrder = mysteryBoxOrderRepository.findByIdForFront(outTradeNo);
        BigDecimal currentPay = amountCheckOrder.baseOrder().payment().payAmount();
        if (!paymentRetentionService.matchesPayAmountAllowingStalePrepay(outTradeNo, amountMinor, currentPay)) {
            log.warn("WeChat notify amount mismatch orderId={} amountMinor={} payAmount={}",
                    outTradeNo, amountMinor, currentPay);
            paymentMetrics.paymentNotifyRejected();
            throw new BusinessException("微信支付金额不匹配");
        }
        if (paymentRetentionService.isStalePrepayOverpay(outTradeNo, amountMinor, currentPay)) {
            BigDecimal claimed = paymentRetentionService.claimedDiscountRaw(outTradeNo);
            log.warn("WeChat stale prepay overpay reconciled orderId={}", outTradeNo);
            paymentRetentionService.reconcileStaleOverpay(outTradeNo, currentPay.add(claimed));
        }
        if (!paymentNotifyLogService.tryBegin(outTradeNo, transactionId, "wechat", body)) {
            log.info("重复支付回调已忽略 orderId={}", outTradeNo);
            return WECHAT_NOTIFY_SUCCESS;
        }
        try {
            completeOrderAfterPayment(outTradeNo, transactionId, "notify");
            paymentNotifyLogService.markProcessed(outTradeNo, "wechat", body);
        } catch (Exception ex) {
            paymentMetrics.paymentFailure();
            paymentNotifyLogService.markFailed(outTradeNo, "wechat");
            paymentReliabilityService.recordPaymentEvent(null, outTradeNo, "notify", "fail", ex.getMessage(), 0);
            throw ex;
        }
        return WECHAT_NOTIFY_SUCCESS;
    }

    /**
     * 对账任务或人工补单：微信侧已支付但本地仍为待支付时调用。
     */
    @Transactional
    public void reconcilePayment(String orderId, String transactionId, String eventType) {
        completeOrderAfterPayment(orderId, transactionId, eventType);
    }

    /**
     * 开发/联调用：模拟支付成功，走与微信回调一致的开奖与状态流转。
     */
    @Transactional
    public String mockPay(String id) {
        prepayService.loadPayableOrder(id);
        String tradeNo = IdUtil.fastSimpleUUID();
        completeOrderAfterPayment(id, tradeNo, "mock");
        log.info("Mock 支付完成，orderId={}, tradeNo={}", id, tradeNo);
        return id;
    }

    void completeOrderAfterPayment(String outTradeNo, String transactionId, String eventType) {
        MysteryBoxOrder mysteryBoxOrder = mysteryBoxOrderRepository.findByIdForFront(outTradeNo);
        if (mysteryBoxOrder.status().equals(ProductOrderStatus.CLOSED)) {
            // Unpaid auto-cancel already released pool; gateway capture arrived late — refund, do not draw.
            refundService.handlePaidAfterCancel(mysteryBoxOrder, transactionId, eventType);
            return;
        }
        if (!mysteryBoxOrder.status().equals(ProductOrderStatus.TO_BE_PAID)) {
            log.info("重复支付处理，忽略，orderId={}, status={}", mysteryBoxOrder.id(), mysteryBoxOrder.status());
            return;
        }
        // CAS claim before draw/pool: only one notify/reconcile wins; losers abort as already completed.
        if (!mysteryBoxOrderRepository.claimPaid(mysteryBoxOrder.id())) {
            log.info("重复支付处理，CAS 失败，orderId={}", mysteryBoxOrder.id());
            return;
        }
        StpUtil.switchTo(mysteryBoxOrder.creator().id());
        // Fail closed before pool/stock mutation when pity cannot be fulfilled.
        for (var item : mysteryBoxOrder.items()) {
            String userId = mysteryBoxOrder.creator().id();
            if (mysteryBoxUserPityService.shouldForceHigh(userId, item.mysteryBoxId())
                    && !prizeStockService.hasHighTierStock(item.mysteryBoxId())) {
                mysteryBoxUserPityService.markCompensatePending(userId, item.mysteryBoxId());
                handlePityStockExhaustedAfterPayment(mysteryBoxOrder, transactionId, eventType);
                return;
            }
        }
        try {
            drawService.drawPaidOrderItems(mysteryBoxOrder);
        } catch (BusinessException ex) {
            if (MysteryBoxOrderPrepayService.isPityStockExhausted(ex)) {
                // Nested draw txn marked this txn rollback-only; refund after rollback so it commits.
                String orderId = mysteryBoxOrder.id();
                String userId = mysteryBoxOrder.creator().id();
                for (var item : mysteryBoxOrder.items()) {
                    mysteryBoxUserPityService.markCompensatePending(userId, item.mysteryBoxId());
                }
                if ("mock".equalsIgnoreCase(eventType)) {
                    MysteryBoxOrderPrepayService.throwPityStockExhausted();
                }
                final String txId = transactionId;
                final String evt = eventType;
                if (org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive()) {
                    org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                            new org.springframework.transaction.support.TransactionSynchronization() {
                                @Override
                                public void afterCompletion(int status) {
                                    try {
                                        refundService.executePityStockGatewayRefund(orderId, txId, evt);
                                    } catch (Exception refundEx) {
                                        log.error("Pity stock auto-refund after rollback failed orderId={}",
                                                orderId, refundEx);
                                        try {
                                            refundService.ensurePityRefundingTicket(orderId);
                                        } catch (Exception ensureEx) {
                                            log.error("Pity refund ticket ensure failed orderId={}",
                                                    orderId, ensureEx);
                                        }
                                    }
                                }
                            });
                } else {
                    refundService.executePityStockGatewayRefund(orderId, txId, evt);
                }
                throw ex;
            }
            throw ex;
        }
        paymentRepository.updatePayTimeAndTradeNo(mysteryBoxOrder.id(), transactionId, LocalDateTime.now());
        orderLogisticsService.recordPaid(mysteryBoxOrder.id());
        // Status already TO_BE_DELIVERED via claimPaid CAS above.
        paymentReliabilityService.recordPaymentEvent(mysteryBoxOrder.creator().id(), mysteryBoxOrder.id(), eventType, "success", "", 0);
        paymentMetrics.paymentSuccess();
        referralService.grantCommissionOnPayment(
                mysteryBoxOrder.creator().id(),
                mysteryBoxOrder.id(),
                mysteryBoxOrder.baseOrder().payment().payAmount());
        userNotificationService.push(
                mysteryBoxOrder.creator().id(),
                "ORDER",
                "支付成功",
                "您的盲盒订单已支付，开奖结果可在订单详情查看",
                mysteryBoxOrder.id()
        );
    }

    /**
     * Gateway already captured (notify/reconcile) or mock completion raced into empty high stock.
     * PENDING is already written in REQUIRES_NEW; ensure a refund path and leave compensate UI usable.
     * Does not clear pity (unlike normal refunds).
     */
    private void handlePityStockExhaustedAfterPayment(
            MysteryBoxOrder mysteryBoxOrder,
            String transactionId,
            String eventType
    ) {
        if ("mock".equalsIgnoreCase(eventType)) {
            MysteryBoxOrderPrepayService.throwPityStockExhausted();
        }
        refundService.executePityStockGatewayRefund(mysteryBoxOrder.id(), transactionId, eventType);
    }
}
