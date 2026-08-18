package io.github.qifan777.server.box.order.service;

import io.github.qifan777.server.dict.model.ProductOrderStatus;

import cn.dev33.satoken.stp.StpUtil;
import com.github.binarywang.wxpay.bean.result.WxPayUnifiedOrderV3Result;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.pity.service.MysteryBoxUserPityService;
import io.github.qifan777.server.box.product.service.PrizeStockService;
import io.github.qifan777.server.box.queue.service.MysteryBoxDrawQueueService;
import io.github.qifan777.server.box.slot.service.MysteryBoxPoolSlotService;
import io.github.qifan777.server.infrastructure.error.MoneyPathErrorCode;
import io.github.qifan777.server.notification.service.UserNotificationService;
import io.github.qifan777.server.payment.gateway.MoMoPaymentGateway;
import io.github.qifan777.server.payment.gateway.MoMoPrepayView;
import io.github.qifan777.server.payment.gateway.VNPayPaymentGateway;
import io.github.qifan777.server.payment.gateway.VNPayPrepayView;
import io.github.qifan777.server.payment.metrics.PaymentMetrics;
import io.github.qifan777.server.payment.model.WeChatPayModel;
import io.github.qifan777.server.payment.service.PaymentReliabilityService;
import io.github.qifan777.server.payment.service.WeChatPayService;
import io.github.qifan777.server.user.compliance.UserSpendLimitService;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.function.Function;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MysteryBoxOrderPrepayService {
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final WeChatPayService weChatPayService;
    private final VNPayPaymentGateway vnpayPaymentGateway;
    private final MoMoPaymentGateway momoPaymentGateway;
    private final PaymentReliabilityService paymentReliabilityService;
    private final PaymentMetrics paymentMetrics;
    private final PaymentRetentionService paymentRetentionService;
    private final UserSpendLimitService userSpendLimitService;
    private final MysteryBoxUserPityService mysteryBoxUserPityService;
    private final PrizeStockService prizeStockService;
    private final UserNotificationService userNotificationService;
    private final OrderDrawMetaService orderDrawMetaService;
    private final MysteryBoxDrawQueueService mysteryBoxDrawQueueService;
    private final MysteryBoxPoolSlotService mysteryBoxPoolSlotService;

    @Transactional
    public VNPayPrepayView prepayVNPay(String id, String clientIp) {
        return prepayWithGateway(id, "vnpay", order -> vnpayPaymentGateway.prepay(
                order.baseOrder(),
                5,
                "/front/mystery-box-order/notify/pay/vnpay",
                clientIp));
    }

    @Transactional
    public MoMoPrepayView prepayMoMo(String id, String clientIp) {
        return prepayWithGateway(id, "momo", order -> momoPaymentGateway.prepay(
                order.baseOrder(),
                5,
                "/front/mystery-box-order/notify/pay/momo",
                clientIp));
    }

    /**
     * 生成预支付参数
     * @param id 盲盒订单id
     * @return 微信预支付参数
     */
    @Transactional
    public WxPayUnifiedOrderV3Result.JsapiResult prepay(String id) {
        MysteryBoxOrder mysteryBoxOrder = loadPayableOrder(id);
        try {
            WxPayUnifiedOrderV3Result.JsapiResult prepay = weChatPayService.prepay(new WeChatPayModel()
                    .setBaseOrder(mysteryBoxOrder.baseOrder())
                    .setExpiredMinutes(5)
                    .setNotifyUrl("/front/mystery-box-order/notify/pay/wechat"));
            paymentReliabilityService.recordPaymentEvent(mysteryBoxOrder.creator().id(), id, "prepay", "success", "", 0);
            log.info("预支付订单内容：{}", prepay);
            return prepay;
        } catch (Exception ex) {
            paymentMetrics.paymentFailure();
            paymentReliabilityService.recordPaymentEvent(
                    mysteryBoxOrder.creator().id(),
                    id,
                    "prepay",
                    "fail",
                    ex.getClass().getSimpleName(),
                    0
            );
            throw ex;
        }
    }

    MysteryBoxOrder loadPayableOrder(String id) {
        MysteryBoxOrder mysteryBoxOrder = mysteryBoxOrderRepository.findByIdForFront(id);
        checkStatus(mysteryBoxOrder, ProductOrderStatus.TO_BE_PAID);
        checkOwner(mysteryBoxOrder);
        assertDrawModeBeforePayment(mysteryBoxOrder);
        // Fail fast before gateway charge when pity forceHigh has no high-tier stock.
        for (var item : mysteryBoxOrder.items()) {
            assertPityHighStockAvailable(
                    mysteryBoxOrder.creator().id(),
                    item.mysteryBoxId(),
                    item.mysteryBoxCount());
        }
        // Second compliance gate. The first runs at order creation, but an unpaid order can sit around
        // for a day, and in the meantime the user may have hit their cap or crossed an age boundary —
        // and nothing stops a client from creating many orders and paying them all at once.
        paymentRetentionService.applyToOrderBeforePay(id);
        // Reload so gateway / mock pay / spend-limit see post-retention payAmount.
        MysteryBoxOrder payable = mysteryBoxOrderRepository.findByIdForFront(id);
        // Exclude this unpaid order from backlog so we do not double-count its payAmount.
        userSpendLimitService.assertWithinLimit(
                payable.creator().id(),
                payable.baseOrder().payment().payAmount(),
                id);
        return payable;
    }

    void assertPityHighStockAvailable(String userId, String mysteryBoxId) {
        assertPityHighStockAvailable(userId, mysteryBoxId, 1);
    }

    void assertPityHighStockAvailable(String userId, String mysteryBoxId, int upcomingCount) {
        if (!mysteryBoxUserPityService.shouldForceHigh(userId, mysteryBoxId, upcomingCount)) {
            return;
        }
        if (prizeStockService.hasHighTierStock(mysteryBoxId)) {
            return;
        }
        mysteryBoxUserPityService.markCompensatePending(userId, mysteryBoxId);
        // Prepay fail-fast has no refund notify path; alert so the user can open box details.
        userNotificationService.push(
                userId,
                "PITY",
                "保底库存不足",
                "高阶赏暂无库存，请选择积分补偿或等待补货",
                mysteryBoxId
        );
        throwPityStockExhausted();
    }

    static void throwPityStockExhausted() {
        throw new BusinessException(
                MoneyPathErrorCode.PITY_STOCK_EXHAUSTED,
                MoneyPathErrorCode.PITY_STOCK_EXHAUSTED.tokenMessage()
        );
    }

    static boolean isPityStockExhausted(Throwable ex) {
        if (ex == null || ex.getMessage() == null) {
            return false;
        }
        return ex.getMessage().contains(MysteryBoxUserPityService.COMPENSATE_CODE);
    }

    private <T> T prepayWithGateway(String id, String channel, Function<MysteryBoxOrder, T> supplier) {
        MysteryBoxOrder mysteryBoxOrder = loadPayableOrder(id);
        try {
            T prepay = supplier.apply(mysteryBoxOrder);
            paymentReliabilityService.recordPaymentEvent(mysteryBoxOrder.creator().id(), id, "prepay", "success", channel, 0);
            return prepay;
        } catch (Exception ex) {
            paymentMetrics.paymentFailure();
            paymentReliabilityService.recordPaymentEvent(
                    mysteryBoxOrder.creator().id(),
                    id,
                    "prepay",
                    "fail",
                    ex.getClass().getSimpleName(),
                    0
            );
            throw ex;
        }
    }

    void assertDrawModeBeforePayment(MysteryBoxOrder order) {
        String drawMode = orderDrawMetaService.getDrawMode(order.id());
        if (drawMode == null) {
            drawMode = "instant";
        }
        for (var item : order.items()) {
            mysteryBoxDrawQueueService.assertCanDrawInQueue(item.mysteryBoxId(), drawMode);
            if ("buyout".equalsIgnoreCase(drawMode)) {
                mysteryBoxDrawQueueService.assertBuyoutLock(item.mysteryBoxId(), order.creator().id());
            }
            if ("cabinet".equalsIgnoreCase(drawMode)) {
                Integer slotNo = orderDrawMetaService.getSlotNo(order.id());
                if (slotNo != null) {
                    mysteryBoxPoolSlotService.assertReservedByUser(item.mysteryBoxId(), slotNo, order.creator().id());
                }
            }
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

    private void checkOwner(MysteryBoxOrder mysteryBoxOrder) {
        if (!mysteryBoxOrder.creator().id().equals(StpUtil.getLoginIdAsString())) {
            throw new BusinessException(
                    MoneyPathErrorCode.ORDER_OWNERSHIP_DENIED,
                    MoneyPathErrorCode.ORDER_OWNERSHIP_DENIED.tokenMessage("非本人操作"));
        }
    }
}
