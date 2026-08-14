package io.github.qifan777.server.box.order.service;

import io.github.qifan777.server.dict.model.PayType;
import io.github.qifan777.server.dict.model.RefundStatus;
import io.github.qifan777.server.dict.model.ProductOrderStatus;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.IdUtil;
import com.github.binarywang.wxpay.bean.notify.SignatureHeader;
import com.github.binarywang.wxpay.bean.notify.WxPayRefundNotifyV3Result;
import com.github.binarywang.wxpay.bean.request.WxPayRefundV3Request;
import com.github.binarywang.wxpay.bean.result.WxPayRefundV3Result;
import com.github.binarywang.wxpay.service.WxPayService;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.pity.service.MysteryBoxUserPityService;
import io.github.qifan777.server.box.product.service.PrizeStockService;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.infrastructure.model.WxPayPropertiesExtension;
import io.github.qifan777.server.infrastructure.money.MoneyRounding;
import io.github.qifan777.server.infrastructure.util.ClientIpResolver;
import io.github.qifan777.server.notification.service.UserNotificationService;
import io.github.qifan777.server.payment.gateway.PaymentRefundResult;
import io.github.qifan777.server.payment.gateway.VNPayPaymentGateway;
import io.github.qifan777.server.payment.repository.PaymentRepository;
import io.github.qifan777.server.payment.service.PaymentReliabilityService;
import io.github.qifan777.server.refund.entity.RefundRecord;
import io.github.qifan777.server.refund.entity.RefundRecordDraft;
import io.github.qifan777.server.refund.repository.RefundRecordRepository;
import io.github.qifan777.server.refund.service.RefundRecordService;
import io.github.qifan777.server.refund.wx.WeChatRefundNotifyDetails;
import io.github.qifan777.server.user.root.service.UserWalletService;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MysteryBoxOrderRefundService {
    private static final String WECHAT_NOTIFY_SUCCESS = "{\"code\":\"SUCCESS\",\"message\":\"成功\"}";

    private final WxPayPropertiesExtension wxPayPropertiesExtension;
    private final WxPayService wxPayService;
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final MysteryBoxRepository mysteryBoxRepository;
    private final PaymentRepository paymentRepository;
    private final RefundRecordRepository refundRecordRepository;
    private final RefundRecordService refundRecordService;
    private final PaymentReliabilityService paymentReliabilityService;
    private final PrizeStockService prizeStockService;
    private final OrderDrawMetaService orderDrawMetaService;
    private final UserNotificationService userNotificationService;
    private final VNPayPaymentGateway vnpayPaymentGateway;
    private final UserWalletService userWalletService;
    private final PlatformTransactionManager transactionManager;
    private final ClientIpResolver clientIpResolver;
    /** Lazy to avoid cycle with WarehouseShipService → MysteryBoxOrderService. */
    private final ObjectProvider<io.github.qifan777.server.warehouse.WarehouseShipService> warehouseShipService;

    @Value("${payment.mock-enabled:false}")
    private boolean paymentMockEnabled;

    @Value("${wx.pay.mch-id:}")
    private String wxMchId;

    private TransactionTemplate requiresNewTransaction;

    @PostConstruct
    void initRequiresNewTransaction() {
        requiresNewTransaction = new TransactionTemplate(transactionManager);
        requiresNewTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /**
     * 管理员在后台取消已支付的订单，并发起退款操作
     * @param id 订单id
     * @return 订单id
     */
    @Transactional
    @SneakyThrows
    public String paidCancelForAdmin(String id) {
        MysteryBoxOrder mysteryBoxOrder = mysteryBoxOrderRepository.findByIdForFront(id);
        checkStatus(mysteryBoxOrder, ProductOrderStatus.TO_BE_RECEIVED, ProductOrderStatus.TO_BE_DELIVERED);
        String refundOrderId = IdUtil.fastSimpleUUID();
        BigDecimal payAmount = mysteryBoxOrder.baseOrder().payment().payAmount();
        PayType payType = mysteryBoxOrder.baseOrder().payment().payType();
        boolean vnPayChannel = refundRecordService.isVnPayChannel(payType);
        RefundRecord refundRecord = RefundRecordDraft.$.produce(draft -> {
            draft.setId(refundOrderId);
            draft.setOrderId(id);
            draft.setAmount(payAmount);
            draft.setReason("退款");
            draft.setStatus(RefundStatus.REFUNDING);
        });
        if (refundRecordService.isMoMoRefundUnsupported(payType)) {
            refundRecordRepository.save(refundRecord);
            throw new BusinessException("MoMo 退款通道未开通，已保留退款工单请人工处理");
        }
        // Wallet only for mock pay — never treat WeChat-unset as balance/wallet for gateway orders.
        boolean walletOrMock = paymentMockEnabled;
        // Sync paths (mock/wallet + VNPay) restore stock here; WeChat leaves rollback to refund notify.
        if ((walletOrMock || vnPayChannel)
                && (ProductOrderStatus.TO_BE_DELIVERED.equals(mysteryBoxOrder.status())
                || ProductOrderStatus.TO_BE_RECEIVED.equals(mysteryBoxOrder.status()))) {
            prizeStockService.rollbackByOrderId(id);
        }
        if (walletOrMock) {
            String userId = mysteryBoxOrder.creator().id();
            if (payAmount != null && payAmount.compareTo(BigDecimal.ZERO) > 0) {
                userWalletService.credit(userId, payAmount, "REFUND", "订单退款入账（模拟/余额通道）", id);
            }
            refundRecordService.finalizeLocalRefundSuccess(refundRecord, mysteryBoxOrder, null, false);
            return refundOrderId;
        }
        if (vnPayChannel) {
            String tradeNo = mysteryBoxOrder.baseOrder().payment().tradeNo();
            Optional<PaymentRefundResult> refundResult = vnpayPaymentGateway.refund(
                    id,
                    tradeNo,
                    refundOrderId,
                    payAmount,
                    clientIpResolver.resolveForRefund(),
                    preferredVnPayTxnTime(mysteryBoxOrder));
            PaymentRefundResult result = refundResult.orElseThrow(() -> new BusinessException("VNPay 退款失败"));
            if (!result.success()) {
                throw new BusinessException("VNPay 退款失败: " + result.message());
            }
            // Stock already rolled back — statuses only (warehouse cancel inside finalize).
            refundRecordService.finalizeLocalRefundSuccess(
                    refundRecord, mysteryBoxOrder, result.gatewayRefundId(), false);
            return refundOrderId;
        }
        if (isWxUnset()) {
            refundRecordRepository.save(refundRecord);
            throw new BusinessException("微信退款通道未配置，已保留退款工单请人工处理");
        }
        WxPayRefundV3Request wxPayRefundV3Request = new WxPayRefundV3Request()
                .setOutTradeNo(id)
                .setOutRefundNo(refundOrderId)
                .setNotifyUrl(wxPayPropertiesExtension.getNotifyUrl() + "/front/mystery-box-order/notify/refund/wechat")
                .setReason("退款")
                .setAmount(new WxPayRefundV3Request.Amount()
                        .setRefund(MoneyRounding.toGatewayMinorUnitsInt(payAmount))
                        .setTotal(MoneyRounding.toGatewayMinorUnitsInt(payAmount))
                        .setCurrency("CNY"));
        WxPayRefundV3Result wxPayRefundV3Result = wxPayService.refundV3(wxPayRefundV3Request);
        refundRecord = RefundRecordDraft.$.produce(refundRecord, draft -> draft
                .setRefundId(wxPayRefundV3Result.getRefundId())
                .setRefundApplicationDetails(wxPayRefundV3Result)
                .setStatus(RefundStatus.REFUNDING));
        return refundRecordRepository.save(refundRecord).id();
    }

    /**
     * 微信退款回调
     * @param body 回调的加密请全体
     * @param signatureHeader 回调请求头
     * @return 回调是否成功
     */
    @SneakyThrows
    @Transactional
    public String refundNotifyWeChat(String body, SignatureHeader signatureHeader) {
        WxPayRefundNotifyV3Result.DecryptNotifyResult result = wxPayService.parseRefundNotifyV3Result(body, signatureHeader)
                .getResult();
        log.info("退款回调：{}", result);
        RefundRecord refundRecord = refundRecordRepository.findById(result.getOutRefundNo(), RefundRecordRepository.COMPLEX_FETCHER_FOR_FRONT)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "退款订单不存在"));
        if (refundRecord.status().equals(RefundStatus.SUCCESS) || refundRecord.status().equals(RefundStatus.FAILED)) {
            log.info("重复退款回调，忽略后续处理，refundId={}, status={}", refundRecord.id(), refundRecord.status());
            return WECHAT_NOTIFY_SUCCESS;
        }
        MysteryBoxOrder mysteryBoxOrder = mysteryBoxOrderRepository.findByIdForFront(refundRecord.orderId());
        StpUtil.switchTo(mysteryBoxOrder.creator().id());
        WeChatRefundNotifyDetails notifyDetails = copyRefundNotify(result);
        if (result.getRefundStatus().equals("SUCCESS")) {
            // Align with approve/reconcile: CAS claimSuccess + clawback + coupon restore.
            refundRecordRepository.save(RefundRecordDraft.$.produce(refundRecord, draft -> draft
                    .setRefundNotifyDetails(notifyDetails)));
            refundRecordService.finalizeLocalRefundSuccess(refundRecord, mysteryBoxOrder, result.getRefundId());
        } else {
            RefundRecord produce = RefundRecordDraft.$.produce(refundRecord, draft -> draft
                    .setRefundNotifyDetails(notifyDetails)
                    .setStatus(RefundStatus.FAILED));
            refundRecordRepository.save(produce);
        }
        return WECHAT_NOTIFY_SUCCESS;
    }

    /**
     * User paid after unpaid cancel closed the order. Auto-refund capture; never open a draw.
     */
    void handlePaidAfterCancel(MysteryBoxOrder mysteryBoxOrder, String transactionId, String eventType) {
        String orderId = mysteryBoxOrder.id();
        if (refundRecordRepository.existsRefundingOrSuccess(orderId)) {
            log.info("Paid-after-cancel already refunding/refunded orderId={}", orderId);
            return;
        }
        log.warn("Paid after cancel — auto refund orderId={} eventType={}", orderId, eventType);
        requiresNewTransaction.executeWithoutResult(status ->
                doExecutePaidAfterCancelRefund(orderId, transactionId, eventType));
    }

    void doExecutePaidAfterCancelRefund(String orderId, String transactionId, String eventType) {
        MysteryBoxOrder mysteryBoxOrder = mysteryBoxOrderRepository.findByIdForFront(orderId);
        if (!mysteryBoxOrder.status().equals(ProductOrderStatus.CLOSED)
                && !mysteryBoxOrder.status().equals(ProductOrderStatus.TO_BE_PAID)) {
            log.info("Paid-after-cancel refund skip orderId={} status={}", orderId, mysteryBoxOrder.status());
            return;
        }
        if (refundRecordRepository.existsRefundingOrSuccess(orderId)) {
            return;
        }
        String userId = mysteryBoxOrder.creator().id();
        if (StringUtils.hasText(transactionId)) {
            paymentRepository.updatePayTimeAndTradeNo(orderId, transactionId, LocalDateTime.now());
        }
        BigDecimal payAmount = mysteryBoxOrder.baseOrder().payment().payAmount();
        String refundOrderId = IdUtil.fastSimpleUUID();
        RefundRecord refundRecord = RefundRecordDraft.$.produce(draft -> {
            draft.setId(refundOrderId);
            draft.setOrderId(orderId);
            draft.setAmount(payAmount == null ? BigDecimal.ZERO : payAmount);
            draft.setReason("PAID_AFTER_CANCEL");
            draft.setStatus(RefundStatus.REFUNDING);
        });
        PayType payType = mysteryBoxOrder.baseOrder().payment().payType();
        boolean vnPayChannel = refundRecordService.isVnPayChannel(payType);
        boolean refundSettled = false;
        try {
            if (refundRecordService.isMoMoRefundUnsupported(payType)) {
                refundRecordRepository.save(refundRecord);
                log.warn("Paid-after-cancel MoMo refund ticket kept REFUNDING orderId={}", orderId);
            } else if (paymentMockEnabled) {
                if (payAmount != null && payAmount.compareTo(BigDecimal.ZERO) > 0) {
                    userWalletService.credit(userId, payAmount, "REFUND", "超时取消后到账自动退款", orderId);
                }
                refundRecordService.finalizeLocalRefundSuccess(refundRecord, mysteryBoxOrder, null, false);
                refundSettled = true;
            } else if (vnPayChannel) {
                Optional<PaymentRefundResult> refundResult = vnpayPaymentGateway.refund(
                        orderId,
                        transactionId,
                        refundOrderId,
                        payAmount,
                        clientIpResolver.resolveForRefund(),
                        preferredVnPayTxnTime(mysteryBoxOrder));
                PaymentRefundResult result = refundResult.orElseThrow(() -> new BusinessException("VNPay 退款失败"));
                if (!result.success()) {
                    throw new BusinessException("VNPay 退款失败: " + result.message());
                }
                refundRecordService.finalizeLocalRefundSuccess(
                        refundRecord, mysteryBoxOrder, result.gatewayRefundId(), false);
                refundSettled = true;
            } else if (isWxUnset()) {
                refundRecordRepository.save(refundRecord);
                throw new BusinessException("微信退款通道未配置，已保留退款工单请人工处理");
            } else {
                // Align with pity / admin paid-cancel: submit WeChat refund immediately.
                BigDecimal safeAmount = payAmount == null ? BigDecimal.ZERO : payAmount;
                WxPayRefundV3Request wxPayRefundV3Request = new WxPayRefundV3Request()
                        .setOutTradeNo(orderId)
                        .setOutRefundNo(refundOrderId)
                        .setNotifyUrl(wxPayPropertiesExtension.getNotifyUrl() + "/front/mystery-box-order/notify/refund/wechat")
                        .setReason("超时取消后到账自动退款")
                        .setAmount(new WxPayRefundV3Request.Amount()
                                .setRefund(MoneyRounding.toGatewayMinorUnitsInt(safeAmount))
                                .setTotal(MoneyRounding.toGatewayMinorUnitsInt(safeAmount))
                                .setCurrency("CNY"));
                WxPayRefundV3Result wxPayRefundV3Result = wxPayService.refundV3(wxPayRefundV3Request);
                refundRecord = RefundRecordDraft.$.produce(refundRecord, draft -> draft
                        .setRefundId(wxPayRefundV3Result.getRefundId())
                        .setRefundApplicationDetails(wxPayRefundV3Result)
                        .setStatus(RefundStatus.REFUNDING));
                refundRecordRepository.save(refundRecord);
                log.warn("Paid-after-cancel WeChat refund submitted orderId={} refundId={}",
                        orderId, wxPayRefundV3Result.getRefundId());
            }
            paymentReliabilityService.recordPaymentEvent(
                    userId, orderId, eventType, "paid_after_cancel_refund", "", 0);
            if (refundSettled) {
                userNotificationService.push(
                        userId,
                        "REFUND",
                        "支付已自动退款",
                        "订单已超时关闭，到账金额已原路/余额退回",
                        orderId
                );
            } else {
                userNotificationService.push(
                        userId,
                        "REFUND",
                        "退款处理中",
                        "订单已超时关闭，退款已提交请稍候到账",
                        orderId
                );
            }
        } catch (Exception ex) {
            refundRecordRepository.save(refundRecord);
            paymentReliabilityService.recordPaymentEvent(
                    userId, orderId, eventType, "paid_after_cancel_refund_fail",
                    ex.getMessage() == null ? "" : ex.getMessage(), 0);
            log.error("Paid-after-cancel refund failed orderId={}: {}", orderId, ex.getMessage());
            userNotificationService.push(
                    userId,
                    "REFUND",
                    "退款处理中",
                    "订单已超时关闭，退款已登记请稍候，如长时间未到账请联系客服",
                    orderId
            );
        }
    }

    void executePityStockGatewayRefund(String orderId, String transactionId, String eventType) {
        requiresNewTransaction.executeWithoutResult(status -> doExecutePityStockGatewayRefund(orderId, transactionId, eventType));
    }

    /** Best-effort REFUNDING row so reconcile can retry when outer refund blew up before save. */
    void ensurePityRefundingTicket(String orderId) {
        requiresNewTransaction.executeWithoutResult(status -> {
            if (refundRecordRepository.existsRefundingOrSuccess(orderId)) {
                return;
            }
            MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(orderId);
            BigDecimal payAmount = order.baseOrder() != null && order.baseOrder().payment() != null
                    ? order.baseOrder().payment().payAmount()
                    : BigDecimal.ZERO;
            String refundOrderId = IdUtil.fastSimpleUUID();
            RefundRecord ticket = RefundRecordDraft.$.produce(draft -> {
                draft.setId(refundOrderId);
                draft.setOrderId(orderId);
                draft.setAmount(payAmount == null ? BigDecimal.ZERO : payAmount);
                draft.setReason(MysteryBoxUserPityService.COMPENSATE_CODE);
                draft.setStatus(RefundStatus.REFUNDING);
            });
            refundRecordRepository.save(ticket);
            if (!ProductOrderStatus.CLOSED.equals(order.status())
                    && !ProductOrderStatus.REFUNDED.equals(order.status())) {
                mysteryBoxOrderRepository.changeStatus(orderId, ProductOrderStatus.CLOSED);
            }
            String userId = order.creator() != null ? order.creator().id() : null;
            String mysteryBoxId = order.items() == null || order.items().isEmpty()
                    ? null
                    : order.items().get(0).mysteryBoxId();
            if (StringUtils.hasText(userId)) {
                userNotificationService.push(
                        userId,
                        "PITY",
                        "保底退款处理中",
                        "保底库存不足，退款已登记请稍候，可选择积分补偿或等待补货",
                        mysteryBoxId
                );
            }
        });
    }

    void doExecutePityStockGatewayRefund(String orderId, String transactionId, String eventType) {
        MysteryBoxOrder mysteryBoxOrder = mysteryBoxOrderRepository.findByIdForFront(orderId);
        // Allow TO_BE_DELIVERED: claimPaid may have CAS'd before pity fail-closed / refund.
        if (!mysteryBoxOrder.status().equals(ProductOrderStatus.TO_BE_PAID)
                && !mysteryBoxOrder.status().equals(ProductOrderStatus.CLOSED)
                && !mysteryBoxOrder.status().equals(ProductOrderStatus.TO_BE_DELIVERED)) {
            log.info("Pity refund skip, order already settled orderId={} status={}",
                    orderId, mysteryBoxOrder.status());
            return;
        }
        String userId = mysteryBoxOrder.creator().id();
        String mysteryBoxId = mysteryBoxOrder.items().isEmpty()
                ? null
                : mysteryBoxOrder.items().get(0).mysteryBoxId();
        if (StringUtils.hasText(transactionId)) {
            paymentRepository.updatePayTimeAndTradeNo(orderId, transactionId, LocalDateTime.now());
        }
        BigDecimal payAmount = mysteryBoxOrder.baseOrder().payment().payAmount();
        String refundOrderId = IdUtil.fastSimpleUUID();
        // Draw never ran — release create-time pool hold before refund settlement.
        releasePoolReservationIfNeeded(mysteryBoxOrder);
        RefundRecord refundRecord = RefundRecordDraft.$.produce(draft -> {
            draft.setId(refundOrderId);
            draft.setOrderId(orderId);
            draft.setAmount(payAmount);
            draft.setReason(MysteryBoxUserPityService.COMPENSATE_CODE);
            draft.setStatus(RefundStatus.REFUNDING);
        });
        PayType payType = mysteryBoxOrder.baseOrder().payment().payType();
        boolean vnPayChannel = refundRecordService.isVnPayChannel(payType);
        boolean refundSettled = false;
        try {
            // Never wallet-credit WeChat/gateway when wx is unset — keep REFUNDING for ops.
            if (refundRecordService.isMoMoRefundUnsupported(payType)) {
                refundRecordRepository.save(refundRecord);
                mysteryBoxOrderRepository.changeStatus(orderId, ProductOrderStatus.CLOSED);
                log.warn("Pity MoMo refund ticket kept REFUNDING orderId={}", orderId);
            } else if (paymentMockEnabled) {
                if (payAmount != null && payAmount.compareTo(BigDecimal.ZERO) > 0) {
                    userWalletService.credit(userId, payAmount, "REFUND", "保底库存不足自动退款", orderId);
                }
                // No prize rollback needed if draw never ran; clearPity skipped via COMPENSATE_CODE reason.
                refundRecordService.finalizeLocalRefundSuccess(refundRecord, mysteryBoxOrder, null, false);
                refundSettled = true;
            } else if (vnPayChannel) {
                Optional<PaymentRefundResult> refundResult = vnpayPaymentGateway.refund(
                        orderId,
                        transactionId,
                        refundOrderId,
                        payAmount,
                        clientIpResolver.resolveForRefund(),
                        preferredVnPayTxnTime(mysteryBoxOrder));
                PaymentRefundResult result = refundResult.orElseThrow(() -> new BusinessException("VNPay 退款失败"));
                if (!result.success()) {
                    throw new BusinessException("VNPay 退款失败: " + result.message());
                }
                refundRecordService.finalizeLocalRefundSuccess(
                        refundRecord, mysteryBoxOrder, result.gatewayRefundId(), false);
                refundSettled = true;
            } else if (isWxUnset()) {
                refundRecordRepository.save(refundRecord);
                mysteryBoxOrderRepository.changeStatus(orderId, ProductOrderStatus.CLOSED);
                throw new BusinessException("微信退款通道未配置，已保留退款工单请人工处理");
            } else {
                WxPayRefundV3Request wxPayRefundV3Request = new WxPayRefundV3Request()
                        .setOutTradeNo(orderId)
                        .setOutRefundNo(refundOrderId)
                        .setNotifyUrl(wxPayPropertiesExtension.getNotifyUrl() + "/front/mystery-box-order/notify/refund/wechat")
                        .setReason("保底库存不足自动退款")
                        .setAmount(new WxPayRefundV3Request.Amount()
                                .setRefund(MoneyRounding.toGatewayMinorUnitsInt(payAmount))
                                .setTotal(MoneyRounding.toGatewayMinorUnitsInt(payAmount))
                                .setCurrency("CNY"));
                WxPayRefundV3Result wxPayRefundV3Result = wxPayService.refundV3(wxPayRefundV3Request);
                refundRecord = RefundRecordDraft.$.produce(refundRecord, draft -> draft
                        .setRefundId(wxPayRefundV3Result.getRefundId())
                        .setRefundApplicationDetails(wxPayRefundV3Result)
                        .setStatus(RefundStatus.REFUNDING));
                refundRecordRepository.save(refundRecord);
                mysteryBoxOrderRepository.changeStatus(orderId, ProductOrderStatus.CLOSED);
            }
            paymentReliabilityService.recordPaymentEvent(
                    userId, orderId, eventType, "pity_stock_refund", "", 0);
            if (refundSettled) {
                userNotificationService.push(
                        userId,
                        "PITY",
                        "保底库存不足",
                        "订单已自动退款，请选择积分补偿或等待补货",
                        mysteryBoxId
                );
            } else {
                userNotificationService.push(
                        userId,
                        "PITY",
                        "保底退款处理中",
                        "保底库存不足，退款已提交请稍候，可选择积分补偿或等待补货",
                        mysteryBoxId
                );
            }
        } catch (Exception ex) {
            // Keep REFUNDING for RefundReconciliationJob retry.
            refundRecordRepository.save(refundRecord);
            mysteryBoxOrderRepository.changeStatus(orderId, ProductOrderStatus.CLOSED);
            paymentReliabilityService.recordPaymentEvent(
                    userId, orderId, eventType, "pity_stock_refund_fail",
                    ex.getMessage() == null ? "" : ex.getMessage(), 0);
            log.error("Pity stock auto-refund failed orderId={}: {}", orderId, ex.getMessage());
            userNotificationService.push(
                    userId,
                    "PITY",
                    "保底退款处理中",
                    "保底库存不足，退款已登记请稍候，可选择积分补偿或等待补货",
                    mysteryBoxId
            );
        }
    }

    boolean isWxUnset() {
        return wxMchId == null || wxMchId.isBlank() || wxMchId.contains("local") || wxMchId.contains("xxxx");
    }

    static LocalDateTime preferredVnPayTxnTime(MysteryBoxOrder order) {
        if (order.baseOrder() != null
                && order.baseOrder().payment() != null
                && order.baseOrder().payment().payTime() != null) {
            return order.baseOrder().payment().payTime();
        }
        return order.createdTime();
    }

    /** Restore pool units held at create when the order never reached a successful draw. */
    private void releasePoolReservationIfNeeded(MysteryBoxOrder order) {
        if (order == null || !orderDrawMetaService.isPoolReserved(order.id())) {
            return;
        }
        if (order.items() != null) {
            for (var item : order.items()) {
                mysteryBoxRepository.restorePool(item.mysteryBoxId(), item.mysteryBoxCount());
            }
        }
        orderDrawMetaService.clearPoolReserved(order.id());
    }

    /** Kept for WarehouseShipService cycle break; finalize paths may call via ObjectProvider. */
    @SuppressWarnings("unused")
    void cancelPendingWarehouseShips(String orderId) {
        try {
            io.github.qifan777.server.warehouse.WarehouseShipService shipService = warehouseShipService.getIfAvailable();
            if (shipService != null) {
                shipService.cancelPendingForOrder(orderId);
            }
        } catch (Exception ex) {
            log.warn("cancelPendingForOrder failed orderId={}", orderId, ex);
        }
    }

    private void checkStatus(MysteryBoxOrder mysteryBoxOrder, ProductOrderStatus... productOrderStatusList) {
        for (var status : productOrderStatusList) {
            if (mysteryBoxOrder.status().equals(status)) {
                return;
            }
        }
        throw new BusinessException(ResultCode.ParamSetIllegal, "订单状态不正确");
    }

    private static WeChatRefundNotifyDetails copyRefundNotify(
            WxPayRefundNotifyV3Result.DecryptNotifyResult result) {
        WeChatRefundNotifyDetails details = new WeChatRefundNotifyDetails();
        org.springframework.beans.BeanUtils.copyProperties(result, details);
        return details;
    }
}
