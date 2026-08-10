package io.github.qifan777.server.refund.service;

import cn.hutool.core.util.IdUtil;
import com.github.binarywang.wxpay.bean.request.WxPayRefundV3Request;
import com.github.binarywang.wxpay.bean.result.WxPayRefundV3Result;
import com.github.binarywang.wxpay.service.WxPayService;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.payment.gateway.PaymentRefundResult;
import io.github.qifan777.server.payment.gateway.VNPayPaymentGateway;
import io.github.qifan777.server.infrastructure.model.WxPayPropertiesExtension;
import io.github.qifan777.server.notification.service.UserNotificationService;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.refund.entity.RefundRecord;
import io.github.qifan777.server.refund.entity.RefundRecordDraft;
import io.github.qifan777.server.refund.entity.dto.RefundRecordSpec;
import io.github.qifan777.server.refund.repository.RefundRecordRepository;
import io.github.qifan777.server.user.root.service.UserWalletService;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
    private final RefundRecordRepository refundRecordRepository;
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final UserWalletService userWalletService;
    private final UserNotificationService userNotificationService;
    private final WxPayService wxPayService;
    private final WxPayPropertiesExtension wxPayPropertiesExtension;
    private final VNPayPaymentGateway vnpayPaymentGateway;
    private final MarketProperties marketProperties;

    @Value("${payment.mock-enabled:true}")
    private boolean paymentMockEnabled;

    @Value("${wx.pay.mch-id:}")
    private String wxMchId;

    @Transactional
    public String apply(String userId, String orderId, String reason, BigDecimal amount) {
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(orderId);
        if (!order.creator().id().equals(userId)) {
            throw new BusinessException("只能对自己的订单申请退款");
        }
        if (!order.status().equals(DictConstants.ProductOrderStatus.TO_BE_DELIVERED)
                && !order.status().equals(DictConstants.ProductOrderStatus.TO_BE_RECEIVED)) {
            throw new BusinessException("当前订单状态不可申请退款");
        }
        BigDecimal payAmount = order.baseOrder().payment().payAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            amount = payAmount;
        }
        if (payAmount != null && amount.compareTo(payAmount) > 0) {
            throw new BusinessException("退款金额不能超过实付金额");
        }
        final BigDecimal refundAmount = amount;
        RefundRecordSpec pendingSpec = new RefundRecordSpec();
        pendingSpec.setOrderId(orderId);
        pendingSpec.setStatus(DictConstants.RefundStatus.REFUNDING);
        QueryRequest<RefundRecordSpec> pendingQuery = new QueryRequest<>();
        pendingQuery.setQuery(pendingSpec);
        pendingQuery.setPageNum(1);
        pendingQuery.setPageSize(1);
        if (refundRecordRepository.findPage(pendingQuery, RefundRecordRepository.COMPLEX_FETCHER_FOR_FRONT)
                .getTotalElements() > 0) {
            throw new BusinessException("该订单已有退款申请处理中");
        }
        String id = IdUtil.fastSimpleUUID();
        RefundRecord record = RefundRecordDraft.$.produce(draft -> draft
                .setId(id)
                .setOrderId(orderId)
                .setReason(reason == null ? "用户申请退款" : reason)
                .setAmount(refundAmount)
                .setStatus(DictConstants.RefundStatus.REFUNDING));
        refundRecordRepository.save(record);
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
        if (paymentMockEnabled || isWxUnset()) {
            userWalletService.credit(userId, record.amount(), "REFUND", "订单退款入账（模拟/余额通道）", record.orderId());
            mysteryBoxOrderRepository.changeStatus(record.orderId(), DictConstants.ProductOrderStatus.REFUNDED);
            refundRecordRepository.save(RefundRecordDraft.$.produce(record, draft -> draft
                    .setStatus(DictConstants.RefundStatus.SUCCESS)));
            userNotificationService.push(userId, "REFUND", "退款已通过", formatRefundAmount(record.amount()) + " 已退回余额", record.orderId());
            return;
        }
        DictConstants.PayType payType = order.baseOrder().payment().payType();
        if (payType == DictConstants.PayType.VN_PAY || "vnpay".equalsIgnoreCase(marketProperties.getPaymentProvider())) {
            String tradeNo = order.baseOrder().payment().tradeNo();
            Optional<PaymentRefundResult> refundResult = vnpayPaymentGateway.refund(
                    record.orderId(),
                    tradeNo,
                    record.id(),
                    record.amount(),
                    "127.0.0.1");
            PaymentRefundResult result = refundResult.orElseThrow(() -> new BusinessException("VNPay 退款失败"));
            if (!result.success()) {
                throw new BusinessException("VNPay 退款失败: " + result.message());
            }
            refundRecordRepository.save(RefundRecordDraft.$.produce(record, draft -> draft
                    .setRefundId(result.gatewayRefundId())
                    .setStatus(DictConstants.RefundStatus.REFUNDING)));
            userNotificationService.push(userId, "REFUND", "退款处理中", "VNPay 退款已发起，请留意到账", record.orderId());
            return;
        }
        String outRefundNo = record.id();
        WxPayRefundV3Request request = new WxPayRefundV3Request()
                .setOutTradeNo(record.orderId())
                .setOutRefundNo(outRefundNo)
                .setNotifyUrl(wxPayPropertiesExtension.getNotifyUrl() + "/front/mystery-box-order/notify/refund/wechat")
                .setReason(record.reason())
                .setAmount(new WxPayRefundV3Request.Amount()
                        .setRefund(record.amount().multiply(BigDecimal.valueOf(100)).intValue())
                        .setTotal(order.baseOrder().payment().payAmount().multiply(BigDecimal.valueOf(100)).intValue())
                        .setCurrency("CNY"));
        WxPayRefundV3Result wxResult = wxPayService.refundV3(request);
        refundRecordRepository.save(RefundRecordDraft.$.produce(record, draft -> draft
                .setRefundId(wxResult.getRefundId())
                .setRefundApplicationDetails(wxResult)
                .setStatus(DictConstants.RefundStatus.REFUNDING)));
        userNotificationService.push(userId, "REFUND", "退款处理中", "微信退款已发起，请留意到账", record.orderId());
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
        if ("VND".equalsIgnoreCase(marketProperties.getCurrency())) {
            return amount.stripTrailingZeros().toPlainString() + " ₫";
        }
        return "¥" + amount;
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
                        "WX_REFUNDING",
                        "微信退款处理中",
                        record.editedTime() != null ? record.editedTime() : record.createdTime(),
                        record.refundId()
                ));
            }
        }
        if (DictConstants.RefundStatus.SUCCESS.getKeyEnName().equals(status)) {
            events.add(new RefundTimelineEvent(
                    "SUCCESS",
                    "退款成功，¥" + record.amount() + " 已退回",
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
}
