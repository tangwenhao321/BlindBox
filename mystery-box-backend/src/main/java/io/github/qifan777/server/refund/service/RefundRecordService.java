package io.github.qifan777.server.refund.service;

import cn.hutool.core.util.IdUtil;
import com.github.binarywang.wxpay.bean.request.WxPayRefundV3Request;
import com.github.binarywang.wxpay.bean.result.WxPayRefundQueryV3Result;
import com.github.binarywang.wxpay.bean.result.WxPayRefundV3Result;
import com.github.binarywang.wxpay.service.WxPayService;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.pity.service.MysteryBoxUserPityService;
import io.github.qifan777.server.box.product.service.PrizeStockService;
import io.github.qifan777.server.coupon.root.service.CouponService;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.dict.model.DictConstants.CouponUseStatus;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.payment.gateway.PaymentRefundResult;
import io.github.qifan777.server.payment.gateway.VNPayPaymentGateway;
import io.github.qifan777.server.infrastructure.model.WxPayPropertiesExtension;
import io.github.qifan777.server.infrastructure.money.MoneyRounding;
import io.github.qifan777.server.notification.service.UserNotificationService;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.infrastructure.error.MoneyPathErrorCode;
import io.github.qifan777.server.referral.service.ReferralService;
import io.github.qifan777.server.refund.entity.RefundRecord;
import io.github.qifan777.server.refund.entity.RefundRecordDraft;
import io.github.qifan777.server.refund.entity.dto.RefundRecordSpec;
import io.github.qifan777.server.refund.repository.RefundRecordRepository;
import io.github.qifan777.server.user.root.service.UserWalletService;
import io.github.qifan777.server.warehouse.WarehouseShipService;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class RefundRecordService {
    public static final String DRAW_INTEGRITY_EMPTY_REASON = "DRAW_INTEGRITY_EMPTY";

    private final RefundRecordRepository refundRecordRepository;
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final UserWalletService userWalletService;
    private final UserNotificationService userNotificationService;
    private final WxPayService wxPayService;
    private final WxPayPropertiesExtension wxPayPropertiesExtension;
    private final VNPayPaymentGateway vnpayPaymentGateway;
    private final MarketProperties marketProperties;
    private final MysteryBoxUserPityService mysteryBoxUserPityService;
    private final PrizeStockService prizeStockService;
    /** ObjectProvider avoids cycle: WarehouseShipService → MysteryBoxOrderService → RefundRecordService. */
    private final ObjectProvider<WarehouseShipService> warehouseShipService;
    private final ReferralService referralService;
    private final CouponService couponService;

    @Value("${payment.mock-enabled:false}")
    private boolean paymentMockEnabled;

    @Value("${wx.pay.mch-id:}")
    private String wxMchId;

    @Transactional
    public String apply(String userId, String orderId, String reason, BigDecimal amount) {
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(orderId);
        if (!order.creator().id().equals(userId)) {
            throw new BusinessException(
                    MoneyPathErrorCode.ORDER_OWNERSHIP_DENIED,
                    MoneyPathErrorCode.ORDER_OWNERSHIP_DENIED.tokenMessage("只能对自己的订单申请退款"));
        }
        if (!order.status().equals(DictConstants.ProductOrderStatus.TO_BE_DELIVERED)
                && !order.status().equals(DictConstants.ProductOrderStatus.TO_BE_RECEIVED)) {
            throw new BusinessException(
                    MoneyPathErrorCode.REFUND_DENIED,
                    MoneyPathErrorCode.REFUND_DENIED.tokenMessage());
        }
        boolean drawn = order.items() != null && order.items().stream().anyMatch(item ->
                item != null && item.products() != null && !item.products().isEmpty());
        if (drawn) {
            throw new BusinessException(
                    MoneyPathErrorCode.REFUND_DENIED,
                    MoneyPathErrorCode.REFUND_DENIED.tokenMessage("开奖后不可申请退款"));
        }
        BigDecimal payAmount = order.baseOrder().payment().payAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            amount = payAmount;
        }
        if (payAmount != null && amount.compareTo(payAmount) > 0) {
            throw new BusinessException(
                    MoneyPathErrorCode.PAYMENT_AMOUNT_MISMATCH,
                    MoneyPathErrorCode.PAYMENT_AMOUNT_MISMATCH.tokenMessage("退款金额不能超过实付金额"));
        }
        final BigDecimal refundAmount = amount;
        String id = IdUtil.fastSimpleUUID();
        RefundRecord record = RefundRecordDraft.$.produce(draft -> draft
                .setId(id)
                .setOrderId(orderId)
                .setReason(reason == null ? "用户申请退款" : reason)
                .setAmount(refundAmount)
                .setStatus(DictConstants.RefundStatus.REFUNDING));
        try {
            refundRecordRepository.save(record);
        } catch (DuplicateKeyException dup) {
            throw new BusinessException(
                    MoneyPathErrorCode.REFUND_IN_PROGRESS,
                    MoneyPathErrorCode.REFUND_IN_PROGRESS.tokenMessage());
        }
        userNotificationService.push(userId, "REFUND", "退款申请已提交", "客服将在 1–3 个工作日内审核", orderId);
        return id;
    }

    @Transactional
    @SneakyThrows
    public void approve(String refundId) {
        RefundRecord record = refundRecordRepository.findById(refundId, RefundRecordRepository.COMPLEX_FETCHER_FOR_ADMIN)
                .orElseThrow(() -> new BusinessException("退款记录不存在"));
        if (record.status().equals(DictConstants.RefundStatus.SUCCESS)) {
            return;
        }
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(record.orderId());
        String userId = order.creator().id();
        DictConstants.PayType payType = order.baseOrder().payment().payType();
        // Check MoMo before CAS claim so unsupported tickets stay claimable for manual ops.
        if (isMoMoRefundUnsupported(payType)) {
            userNotificationService.push(userId, "REFUND", "退款处理中",
                    "MoMo 原路退款通道未开通，客服将人工处理", record.orderId());
            throw new BusinessException("MoMo 退款通道未开通，已保留退款工单请人工处理");
        }
        if (!refundRecordRepository.claimForGatewaySubmit(refundId)) {
            throw new BusinessException("退款正在处理中，请勿重复审核");
        }
        boolean vnPayChannel = isVnPayChannel(payType);

        // Mock / balance channel: credit wallet and finalize locally (stock + order).
        // Do NOT treat isWxUnset alone as wallet when the order is VN_PAY — VN prod often has wx unset.
        if (paymentMockEnabled || (!vnPayChannel && isWxUnset())) {
            userWalletService.credit(userId, record.amount(), "REFUND", "订单退款入账（模拟/余额通道）", record.orderId());
            finalizeLocalRefundSuccess(record, order, null);
            userNotificationService.push(userId, "REFUND", "退款已通过", formatRefundAmount(record.amount()) + " 已退回余额", record.orderId());
            return;
        }

        if (vnPayChannel) {
            String tradeNo = order.baseOrder().payment().tradeNo();
            Optional<PaymentRefundResult> refundResult = vnpayPaymentGateway.refund(
                    record.orderId(),
                    tradeNo,
                    record.id(),
                    record.amount(),
                    "127.0.0.1",
                    preferredVnPayTxnTime(order));
            PaymentRefundResult result = refundResult.orElseThrow(() -> new BusinessException("VNPay 退款失败"));
            if (!result.success()) {
                throw new BusinessException("VNPay 退款失败: " + result.message());
            }
            // Sync success (gateway success=true): finalize like WeChat notify.
            // If a future VNPay flow returns async-pending without success, keep REFUNDING here
            // for a reconciliation job — never wallet-credit VN_PAY in that case.
            finalizeLocalRefundSuccess(record, order, result.gatewayRefundId());
            userNotificationService.push(userId, "REFUND", "退款已通过", formatRefundAmount(record.amount()) + " 已原路退回", record.orderId());
            return;
        }

        String outRefundNo = record.id();
        WxPayRefundV3Request request = new WxPayRefundV3Request()
                .setOutTradeNo(record.orderId())
                .setOutRefundNo(outRefundNo)
                .setNotifyUrl(wxPayPropertiesExtension.getNotifyUrl() + "/front/mystery-box-order/notify/refund/wechat")
                .setReason(record.reason())
                .setAmount(new WxPayRefundV3Request.Amount()
                        .setRefund(MoneyRounding.toGatewayMinorUnitsInt(record.amount()))
                        .setTotal(MoneyRounding.toGatewayMinorUnitsInt(order.baseOrder().payment().payAmount()))
                        .setCurrency("CNY"));
        WxPayRefundV3Result wxResult = wxPayService.refundV3(request);
        refundRecordRepository.save(RefundRecordDraft.$.produce(record, draft -> draft
                .setRefundId(wxResult.getRefundId())
                .setRefundApplicationDetails(wxResult)
                .setStatus(DictConstants.RefundStatus.REFUNDING)));
        userNotificationService.push(userId, "REFUND", "退款处理中", "渠道退款已发起，请留意到账", record.orderId());
    }

    /**
     * Local finalize for mock/balance and sync VNPay success: restore prize stock, mark order REFUNDED
     * (warehouse list is status-derived — REFUNDED drops items), SUCCESS refund, clear pity when appropriate.
     */
    public void finalizeLocalRefundSuccess(RefundRecord record, MysteryBoxOrder order, String gatewayRefundId) {
        finalizeLocalRefundSuccess(record, order, gatewayRefundId, true);
    }

    /**
     * @param rollbackStock false when caller already restored stock (e.g. paidCancelForAdmin) or draw never ran
     */
    public void finalizeLocalRefundSuccess(
            RefundRecord record,
            MysteryBoxOrder order,
            String gatewayRefundId,
            boolean rollbackStock
    ) {
        // Money + warehouse side-effects before SUCCESS claim (fail closed).
        restoreCouponIfPresent(order);
        referralService.clawbackCommissionOnRefund(record.orderId());
        WarehouseShipService shipService = warehouseShipService.getIfAvailable();
        if (shipService != null) {
            shipService.cancelPendingForOrder(record.orderId());
        }

        // Claim SUCCESS before stock restore so concurrent approve/reconcile cannot double-restore.
        if (!refundRecordRepository.claimSuccess(record.id(), gatewayRefundId)) {
            log.info("Refund already finalized refundId={} orderId={}", record.id(), record.orderId());
            return;
        }
        if (rollbackStock) {
            prizeStockService.rollbackByOrderId(record.orderId());
        }
        mysteryBoxOrderRepository.changeStatus(record.orderId(), DictConstants.ProductOrderStatus.REFUNDED);
        clearPityForOrder(record, order);
        if (record.reason() != null
                && record.reason().contains(MysteryBoxUserPityService.COMPENSATE_CODE)
                && order.items() != null) {
            String userId = order.creator().id();
            for (var item : order.items()) {
                if (item != null && StringUtils.hasText(item.mysteryBoxId())) {
                    mysteryBoxUserPityService.markCompensateCashRefunded(userId, item.mysteryBoxId());
                }
            }
        }
    }

    /**
     * Retry a stuck REFUNDING record. Conservative: wallet credit is idempotent via REFUND+orderId;
     * WeChat queries refund status via out_refund_no; VNPay retries gateway or finalizes when gatewayRefundId already set.
     *
     * @return true if this call advanced the refund to SUCCESS
     */
    @Transactional
    @SneakyThrows
    public boolean retryStuckRefunding(String refundId) {
        RefundRecord record = refundRecordRepository.findById(refundId, RefundRecordRepository.COMPLEX_FETCHER_FOR_ADMIN)
                .orElse(null);
        if (record == null) {
            return false;
        }
        if (record.status().equals(DictConstants.RefundStatus.SUCCESS)
                || record.status().equals(DictConstants.RefundStatus.FAILED)) {
            return false;
        }
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(record.orderId());
        String userId = order.creator().id();
        DictConstants.PayType payType = order.baseOrder().payment().payType();
        if (isMoMoRefundUnsupported(payType)) {
            log.warn("refund reconcile MoMo unsupported — keep REFUNDING refundId={} orderId={}",
                    refundId, record.orderId());
            return false;
        }
        boolean vnPayChannel = isVnPayChannel(payType);
        boolean pityStuck = record.reason() != null
                && record.reason().contains(MysteryBoxUserPityService.COMPENSATE_CODE)
                && (order.status().equals(DictConstants.ProductOrderStatus.CLOSED)
                || order.status().equals(DictConstants.ProductOrderStatus.TO_BE_DELIVERED)
                || order.status().equals(DictConstants.ProductOrderStatus.REFUNDED));

        // DRAW_INTEGRITY_EMPTY used to wait for admin; auto-settle like other stuck REFUNDING
        // so paid-empty-prize users are not left hanging (mock/VNPay/WeChat query paths below).

        if (paymentMockEnabled || (!vnPayChannel && isWxUnset())) {
            if (record.amount() != null && record.amount().compareTo(BigDecimal.ZERO) > 0) {
                userWalletService.credit(userId, record.amount(), "REFUND", "退款对账入账（模拟/余额通道）", record.orderId());
            }
            finalizeLocalRefundSuccess(record, order, null);
            log.info("refund reconcile finalized mock/balance refundId={} orderId={}", refundId, record.orderId());
            return true;
        }

        if (vnPayChannel) {
            if (StringUtils.hasText(record.refundId())) {
                finalizeLocalRefundSuccess(record, order, record.refundId());
                log.info("refund reconcile finalized VNPay with existing gatewayRefundId refundId={}", refundId);
                return true;
            }
            String tradeNo = order.baseOrder().payment().tradeNo();
            Optional<PaymentRefundResult> refundResult = vnpayPaymentGateway.refund(
                    record.orderId(),
                    tradeNo,
                    record.id(),
                    record.amount(),
                    "127.0.0.1",
                    preferredVnPayTxnTime(order));
            PaymentRefundResult result = refundResult.orElse(null);
            if (result == null || !result.success()) {
                log.warn("refund reconcile VNPay retry not success refundId={} msg={}",
                        refundId, result == null ? "empty" : result.message());
                return false;
            }
            finalizeLocalRefundSuccess(record, order, result.gatewayRefundId());
            log.info("refund reconcile VNPay retry success refundId={} orderId={}", refundId, record.orderId());
            return true;
        }

        // WeChat: out_refund_no is the refund record id (set at refundV3 create time).
        String outRefundNo = record.id();
        try {
            WxPayRefundQueryV3Result queryResult = wxPayService.refundQueryV3(outRefundNo);
            String status = queryResult == null ? null : queryResult.getStatus();
            if ("SUCCESS".equalsIgnoreCase(status)) {
                String gatewayRefundId = queryResult != null && StringUtils.hasText(queryResult.getRefundId())
                        ? queryResult.getRefundId()
                        : record.refundId();
                finalizeLocalRefundSuccess(record, order, gatewayRefundId);
                log.info("refund reconcile WeChat SUCCESS refundId={} orderId={} wxRefundId={}",
                        refundId, record.orderId(), gatewayRefundId);
                return true;
            }
            if ("CLOSED".equalsIgnoreCase(status) || "ABNORMAL".equalsIgnoreCase(status)) {
                refundRecordRepository.save(RefundRecordDraft.$.produce(record, draft ->
                        draft.setStatus(DictConstants.RefundStatus.FAILED)));
                log.warn("refund reconcile WeChat terminal failure refundId={} orderId={} status={}",
                        refundId, record.orderId(), status);
                return false;
            }
            log.info("refund reconcile WeChat still processing refundId={} orderId={} status={}",
                    refundId, record.orderId(), status);
            return false;
        } catch (Exception ex) {
            log.warn("refund reconcile WeChat query failed refundId={} orderId={}",
                    refundId, record.orderId(), ex);
            return false;
        }
    }

    /**
     * Conservative MVP for claimPaid incomplete: create REFUNDING ticket for admin approve, no auto wallet.
     *
     * @return refund id if created, empty if one already exists
     */
    @Transactional
    public Optional<String> createDrawIntegrityEmptyRefundIfAbsent(MysteryBoxOrder order) {
        if (order == null || order.id() == null) {
            return Optional.empty();
        }
        if (refundRecordRepository.existsRefundingOrSuccess(order.id())) {
            return Optional.empty();
        }
        BigDecimal amount = order.baseOrder().payment().payAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            amount = BigDecimal.ZERO;
        }
        String id = IdUtil.fastSimpleUUID();
        BigDecimal refundAmount = amount;
        RefundRecord record = RefundRecordDraft.$.produce(draft -> draft
                .setId(id)
                .setOrderId(order.id())
                .setReason(DRAW_INTEGRITY_EMPTY_REASON)
                .setAmount(refundAmount)
                .setStatus(DictConstants.RefundStatus.REFUNDING));
        refundRecordRepository.save(record);
        userNotificationService.push(
                order.creator().id(),
                "REFUND",
                "订单异常处理中",
                "系统已登记异常退款，客服将尽快处理",
                order.id()
        );
        return Optional.of(id);
    }

    public boolean isVnPayChannel(DictConstants.PayType payType) {
        return payType == DictConstants.PayType.VN_PAY;
    }

    public boolean isMoMoChannel(DictConstants.PayType payType) {
        return payType == DictConstants.PayType.MO_MO;
    }

    /**
     * Live MoMo captures must not wallet-credit or go through VNPay/WeChat refund APIs.
     * Keep REFUNDING for admin until MoMo Partner refund is wired.
     */
    public boolean isMoMoRefundUnsupported(DictConstants.PayType payType) {
        return isMoMoChannel(payType) && !paymentMockEnabled;
    }

    @Transactional
    public void reject(String refundId, String rejectReason) {
        RefundRecord record = refundRecordRepository.findById(refundId, RefundRecordRepository.COMPLEX_FETCHER_FOR_ADMIN)
                .orElseThrow(() -> new BusinessException("退款记录不存在"));
        if (record.status().equals(DictConstants.RefundStatus.SUCCESS)
                || record.status().equals(DictConstants.RefundStatus.FAILED)) {
            return;
        }
        String reason = (rejectReason == null || rejectReason.isBlank()) ? "审核未通过" : rejectReason;
        refundRecordRepository.save(RefundRecordDraft.$.produce(record, draft -> draft
                .setStatus(DictConstants.RefundStatus.FAILED)
                .setReason(record.reason() + "｜驳回：" + reason)));
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(record.orderId());
        userNotificationService.push(
                order.creator().id(),
                "REFUND",
                "退款未通过",
                reason,
                record.orderId()
        );
    }

    private boolean isWxUnset() {
        return wxMchId == null || wxMchId.isBlank() || wxMchId.contains("local") || wxMchId.contains("xxxx");
    }

    private String formatRefundAmount(BigDecimal amount) {
        return marketProperties.formatAmount(amount);
    }

    private String gatewayRefundingLabel(RefundRecord record) {
        try {
            MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(record.orderId());
            DictConstants.PayType payType = order.baseOrder() != null && order.baseOrder().payment() != null
                    ? order.baseOrder().payment().payType()
                    : null;
            if (payType == DictConstants.PayType.MO_MO) {
                return "MoMo 退款处理中";
            }
            if (isVnPayChannel(payType)) {
                return "VNPay 退款处理中";
            }
        } catch (Exception ignored) {
            // fall through
        }
        return "渠道退款处理中";
    }

    public List<RefundTimelineEvent> timeline(String refundId, String userId) {
        RefundRecord record = refundRecordRepository.findById(refundId, RefundRecordRepository.COMPLEX_FETCHER_FOR_FRONT)
                .orElseThrow(() -> new BusinessException("退款记录不存在"));
        if (!record.creator().id().equals(userId)) {
            throw new BusinessException("无权查看");
        }
        List<RefundTimelineEvent> events = new ArrayList<>();
        events.add(new RefundTimelineEvent(
                "APPLIED",
                "提交退款申请",
                record.createdTime(),
                record.reason()
        ));
        String status = record.status().getKeyEnName();
        if (DictConstants.RefundStatus.REFUNDING.getKeyEnName().equals(status)) {
            events.add(new RefundTimelineEvent(
                    "REVIEWING",
                    "客服审核中",
                    record.editedTime() != null ? record.editedTime() : record.createdTime(),
                    null
            ));
            if (StringUtils.hasText(record.refundId())) {
                events.add(new RefundTimelineEvent(
                        "GATEWAY_REFUNDING",
                        gatewayRefundingLabel(record),
                        record.editedTime() != null ? record.editedTime() : record.createdTime(),
                        record.refundId()
                ));
            }
        }
        if (DictConstants.RefundStatus.SUCCESS.getKeyEnName().equals(status)) {
            events.add(new RefundTimelineEvent(
                    "SUCCESS",
                    "退款成功，" + formatRefundAmount(record.amount()) + " 已退回",
                    record.editedTime() != null ? record.editedTime() : record.createdTime(),
                    record.refundId()
            ));
        }
        if (DictConstants.RefundStatus.FAILED.getKeyEnName().equals(status)) {
            events.add(new RefundTimelineEvent(
                    "FAILED",
                    "退款未通过",
                    record.editedTime() != null ? record.editedTime() : record.createdTime(),
                    record.reason()
            ));
        }
        return events;
    }

    public org.springframework.data.domain.Page<RefundAdminRow> queryAdminPage(QueryRequest<RefundRecordSpec> request) {
        org.springframework.data.domain.Page<RefundRecord> page =
                refundRecordRepository.findPage(request, RefundRecordRepository.COMPLEX_FETCHER_FOR_ADMIN);
        return page.map(record -> {
            String payTypeKey = "UNKNOWN";
            String payTypeName = "未知";
            try {
                MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(record.orderId());
                DictConstants.PayType payType = order.baseOrder().payment().payType();
                payTypeKey = payType.getKeyEnName();
                payTypeName = payType.getKeyName();
            } catch (Exception ignored) {
                // order may be deleted
            }
            return new RefundAdminRow(
                    record.id(),
                    record.orderId(),
                    record.reason(),
                    record.amount(),
                    record.status().getKeyEnName(),
                    record.status().getKeyName(),
                    record.createdTime() == null ? "" : record.createdTime().toString(),
                    record.creator() == null ? "" : String.valueOf(record.creator().nickname()),
                    record.creator() == null ? "" : String.valueOf(record.creator().phone()),
                    payTypeKey,
                    payTypeName,
                    record.refundId() == null ? "" : record.refundId()
            );
        });
    }

    public record RefundAdminRow(
            String id,
            String orderId,
            String reason,
            BigDecimal amount,
            String statusKey,
            String statusName,
            String createdTime,
            String creatorNickname,
            String creatorPhone,
            String payTypeKey,
            String payTypeName,
            String refundId
    ) {
    }

    public record RefundTimelineEvent(String step, String label, LocalDateTime at, String detail) {
    }

    private void clearPityForOrder(RefundRecord record, MysteryBoxOrder order) {
        // Pity-stock auto-refunds must keep PENDING/WAIT for the compensate UI.
        if (record != null && record.reason() != null
                && record.reason().contains(MysteryBoxUserPityService.COMPENSATE_CODE)) {
            return;
        }
        if (order == null || order.creator() == null || order.items() == null) {
            return;
        }
        String userId = order.creator().id();
        for (var item : order.items()) {
            if (item.mysteryBoxId() != null) {
                mysteryBoxUserPityService.clearOnRefund(userId, item.mysteryBoxId());
            }
        }
    }

    private void restoreCouponIfPresent(MysteryBoxOrder order) {
        if (order != null && order.baseOrder() != null && order.baseOrder().couponUser() != null) {
            couponService.changeStatus(order.baseOrder().couponUser().id(), CouponUseStatus.UNUSED);
        }
    }

    private static LocalDateTime preferredVnPayTxnTime(MysteryBoxOrder order) {
        if (order.baseOrder() != null
                && order.baseOrder().payment() != null
                && order.baseOrder().payment().payTime() != null) {
            return order.baseOrder().payment().payTime();
        }
        return order.createdTime();
    }
}
