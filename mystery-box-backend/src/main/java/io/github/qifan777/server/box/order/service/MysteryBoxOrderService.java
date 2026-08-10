package io.github.qifan777.server.box.order.service;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.RandomUtil;
import com.github.binarywang.wxpay.bean.notify.SignatureHeader;
import com.github.binarywang.wxpay.bean.notify.WxPayNotifyV3Result;
import com.github.binarywang.wxpay.bean.notify.WxPayRefundNotifyV3Result;
import com.github.binarywang.wxpay.bean.request.WxPayRefundV3Request;
import com.github.binarywang.wxpay.bean.result.WxPayRefundV3Result;
import com.github.binarywang.wxpay.bean.result.WxPayUnifiedOrderV3Result;
import com.github.binarywang.wxpay.service.WxPayService;
import io.github.qifan777.server.Objects;
import io.github.qifan777.server.address.entity.Address;
import io.github.qifan777.server.address.entity.dto.AddressView;
import io.github.qifan777.server.address.repository.AddressRepository;
import io.github.qifan777.server.box.item.repository.MysteryBoxOrderItemRepository;
import io.github.qifan777.server.box.order.OrderIds;
import io.github.qifan777.server.box.order.config.RedeemProperties;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.entity.dto.MysteryBoxOrderInput;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.pack.service.DrawPackConfigService;
import io.github.qifan777.server.box.pity.service.MysteryBoxUserPityService;
import io.github.qifan777.server.box.product.service.PrizeStockService;
import io.github.qifan777.server.box.queue.service.MysteryBoxDrawQueueService;
import io.github.qifan777.server.logistics.service.OrderLogisticsService;
import io.github.qifan777.server.box.root.entity.MysteryBox;
import io.github.qifan777.server.box.root.entity.dto.MystryBoxView;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.box.root.service.NewcomerBoxService;
import io.github.qifan777.server.box.slot.service.MysteryBoxPoolSlotService;
import io.github.qifan777.server.notification.service.UserNotificationService;
import io.github.qifan777.server.referral.service.ReferralService;
import io.github.qifan777.server.box.win.entity.MysteryBoxWinRule;
import io.github.qifan777.server.box.win.service.MysteryBoxWinRuleService;
import io.github.qifan777.server.carriage.service.CarriageTemplateService;
import io.github.qifan777.server.coupon.root.service.CouponService;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.infrastructure.model.WxPayPropertiesExtension;
import io.github.qifan777.server.order.repository.BaseOrderRepository;
import io.github.qifan777.server.payment.entity.Payment;
import io.github.qifan777.server.payment.entity.PaymentDraft;
import io.github.qifan777.server.payment.entity.dto.PaymentCalculateView;
import io.github.qifan777.server.payment.entity.dto.PaymentPriceView;
import io.github.qifan777.server.payment.model.WeChatPayModel;
import io.github.qifan777.server.payment.repository.PaymentRepository;
import io.github.qifan777.server.payment.service.PaymentNotifyLogService;
import io.github.qifan777.server.payment.service.PaymentReliabilityService;
import io.github.qifan777.server.payment.service.WeChatPayService;
import io.github.qifan777.server.payment.metrics.PaymentMetrics;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.payment.gateway.PaymentGatewayRegistry;
import io.github.qifan777.server.payment.gateway.PaymentNotifyResult;
import io.github.qifan777.server.payment.gateway.MoMoPaymentGateway;
import io.github.qifan777.server.payment.gateway.MoMoPrepayView;
import io.github.qifan777.server.payment.gateway.PaymentRefundResult;
import io.github.qifan777.server.payment.gateway.VNPayPaymentGateway;
import io.github.qifan777.server.payment.gateway.VNPayPrepayView;
import io.github.qifan777.server.product.root.entity.Product;
import io.github.qifan777.server.product.root.entity.dto.ProductView;
import io.github.qifan777.server.product.root.repository.ProductRepository;
import io.github.qifan777.server.refund.entity.RefundRecord;
import io.github.qifan777.server.refund.entity.RefundRecordDraft;
import io.github.qifan777.server.refund.repository.RefundRecordRepository;
import io.github.qifan777.server.user.compliance.UserComplianceService;
import io.github.qifan777.server.user.compliance.UserSpendLimitService;
import io.github.qifan777.server.user.root.repository.UserRepository;
import io.github.qifan777.server.user.root.entity.UserBalanceLog;
import io.github.qifan777.server.user.root.entity.UserBalanceLogDraft;
import io.github.qifan777.server.user.root.repository.UserBalanceLogRepository;
import io.github.qifan777.server.vip.root.service.VipService;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.AllArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;

import static io.github.qifan777.server.dict.model.DictConstants.*;

@Service
@Slf4j
@AllArgsConstructor
@Transactional(readOnly = true)
public class MysteryBoxOrderService {
    private static final String WECHAT_NOTIFY_SUCCESS = "{\"code\":\"SUCCESS\",\"message\":\"成功\"}";
    private static final String VNPAY_NOTIFY_SUCCESS = "RspCode=00&Message=Confirm";
    private static final int PROBABILITY_BASE = 10000;
    private final WxPayPropertiesExtension wxPayPropertiesExtension;
    private final CouponService couponService;
    private final CarriageTemplateService carriageTemplateService;
    private final VipService vipService;
    private final WeChatPayService weChatPayService;
    private final WxPayService wxPayService;
    private final ProductRepository productRepository;
    private final MysteryBoxWinRuleService mysteryBoxWinRuleService;
    private final UserRepository userRepository;
    private final UserBalanceLogRepository userBalanceLogRepository;
    private final AddressRepository addressRepository;
    private final BaseOrderRepository baseOrderRepository;
    private final MysteryBoxRepository mysteryBoxRepository;
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final MysteryBoxOrderItemRepository mysteryBoxOrderItemRepository;
    private final PaymentRepository paymentRepository;
    private final RefundRecordRepository refundRecordRepository;
    private final PaymentReliabilityService paymentReliabilityService;
    private final PaymentNotifyLogService paymentNotifyLogService;
    private final NewcomerBoxService newcomerBoxService;
    private final ReferralService referralService;
    private final DrawPackConfigService drawPackConfigService;
    private final PrizeStockService prizeStockService;
    private final MysteryBoxUserPityService mysteryBoxUserPityService;
    private final MysteryBoxDrawQueueService mysteryBoxDrawQueueService;
    private final MysteryBoxPoolSlotService mysteryBoxPoolSlotService;
    private final OrderDrawMetaService orderDrawMetaService;
    private final OrderLogisticsService orderLogisticsService;
    private final PurchaseLimitService purchaseLimitService;
    private final UserComplianceService userComplianceService;
    private final UserSpendLimitService userSpendLimitService;
    private final UserNotificationService userNotificationService;
    private final PaymentRetentionService paymentRetentionService;
    private final PaymentMetrics paymentMetrics;
    private final JdbcTemplate jdbcTemplate;
    private final MarketProperties marketProperties;
    private final PaymentGatewayRegistry paymentGatewayRegistry;
    private final VNPayPaymentGateway vnpayPaymentGateway;
    private final MoMoPaymentGateway momoPaymentGateway;
    private final RedeemProperties redeemProperties;

    /**
     * 调用{@link #calculate(MysteryBoxOrderInput)}计算得到支付详情<br/>
     * 创建盲盒订单对象，盲盒订单项对象，基础订单对象
     * @param mysteryBoxOrderInput 订单输入
     * @return 订单id
     */
    @Transactional
    public String create(MysteryBoxOrderInput mysteryBoxOrderInput) {
        return create(mysteryBoxOrderInput, "instant");
    }

    @Transactional
    public String create(MysteryBoxOrderInput mysteryBoxOrderInput, String drawMode) {
        return create(mysteryBoxOrderInput, drawMode, null);
    }

    @Transactional
    public String create(MysteryBoxOrderInput mysteryBoxOrderInput, String drawMode, Integer slotNo) {
        String userId = StpUtil.getLoginIdAsString();
        userComplianceService.assertAgeConfirmed(userId);
        String mode = drawMode == null ? "instant" : drawMode;
        for (var item : mysteryBoxOrderInput.getItems()) {
            purchaseLimitService.assertWithinDailyLimit(userId, item.getMysteryBoxId(), item.getMysteryBoxCount());
            newcomerBoxService.assertCanPurchase(userId, item.getMysteryBoxId());
            prizeStockService.assertStockAvailable(item.getMysteryBoxId(), item.getMysteryBoxCount());
            mysteryBoxRepository.assertPoolAvailable(item.getMysteryBoxId(), item.getMysteryBoxCount());
            mysteryBoxDrawQueueService.assertCanDrawInQueue(item.getMysteryBoxId(), mode);
            if ("buyout".equalsIgnoreCase(mode)) {
                mysteryBoxDrawQueueService.acquireBuyoutLock(item.getMysteryBoxId(), userId);
                mysteryBoxDrawQueueService.assertBuyoutLock(item.getMysteryBoxId(), userId);
            }
            if ("cabinet".equalsIgnoreCase(mode)) {
                if (slotNo == null || slotNo <= 0) {
                    throw new BusinessException("柜位模式需要指定 slotNo");
                }
                if (item.getMysteryBoxCount() != 1) {
                    throw new BusinessException("柜位模式每次仅可购买 1 个");
                }
                mysteryBoxPoolSlotService.assertReservedByUser(item.getMysteryBoxId(), slotNo, userId);
            }
        }
        String orderId = OrderIds.next();
        orderDrawMetaService.saveFairnessSeed(orderId, IdUtil.fastSimpleUUID());
        PaymentCalculateView calculated = calculate(mysteryBoxOrderInput);
        userSpendLimitService.assertWithinLimit(userId, calculated.payAmount());
        // 支付详情
        Payment payment = PaymentDraft.$.produce(
                calculated.toEntity(),
                paymentDraft -> paymentDraft
                        .setId(orderId)
                        .setPayType(paymentGatewayRegistry.resolveForMarket().payType()));
        Address address = null;
        String addressId = mysteryBoxOrderInput.getBaseOrder().getAddressId();
        if (org.springframework.util.StringUtils.hasText(addressId)) {
            address = addressRepository
                    .findUserAddressById(addressId)
                    .orElseThrow(() -> new BusinessException("地址不存在"));
        }
        Address addressSnapshot = address;
        MysteryBoxOrder entity = Objects.createMysteryBoxOrder(mysteryBoxOrderInput
                        .toEntity(),
                draft -> {
                    // 设置订单项关联的订单id，并且设置盲盒快照
                    draft.setItems(draft
                            .items()
                            .stream()
                            .map(item -> Objects.createMysteryBoxOrderItem(item, mysteryBoxOrderItemDraft -> {
                                MysteryBox box = mysteryBoxRepository
                                        .findById(item.mysteryBoxId(), MysteryBoxRepository.COMPLEX_FETCHER_FOR_FRONT)
                                        .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "盲盒不存在"));
                                mysteryBoxOrderItemDraft.setMysteryBoxOrderId(orderId)
                                        // 盲盒快照，购买时的盲盒详情存入
                                        .setMysteryBox(new MystryBoxView(box));
                            }))
                            .toList()
                    );
                    // 设置订单的id和状态
                    draft.setId(orderId)
                            .setStatus(ProductOrderStatus.TO_BE_PAID);
                    // 设置基础订单
                    draft.baseOrder()
                            .setId(orderId)
                            .setType(OrderType.PRODUCT_ORDER)
                            .setPayment(payment);
                    if (addressSnapshot != null) {
                        draft.baseOrder().setAddress(new AddressView(addressSnapshot));
                    }
                });
        // 同时创建mysteryBoxOrder, mysteryBoxOrderItem, baseOrder, payment
        MysteryBoxOrder save = mysteryBoxOrderRepository.save(entity);
        orderDrawMetaService.saveDrawMode(orderId, mode);
        if ("cabinet".equalsIgnoreCase(mode) && slotNo != null) {
            orderDrawMetaService.saveSlotNo(orderId, slotNo);
            String boxId = mysteryBoxOrderInput.getItems().get(0).getMysteryBoxId();
            mysteryBoxPoolSlotService.bindOrder(boxId, slotNo, orderId);
        }
        orderLogisticsService.recordCreated(orderId);
        // 优惠券设置为已使用
        couponService.changeStatus(mysteryBoxOrderInput.getBaseOrder().getCouponUserId(), CouponUseStatus.USED);
        paymentMetrics.orderCreated();
        return save.id();
    }

    /**
     * 前端输入优惠券id，地址id，盲盒id，购买数量通过计算得到商品总价、优惠券价格、邮费、vip优惠、实付金额
     * @param mysteryBoxOrderInput 订单表单
     * @return 计算价格
     */
    public PaymentCalculateView calculate(MysteryBoxOrderInput mysteryBoxOrderInput) {
        return calculate(mysteryBoxOrderInput, false, null);
    }

    public PaymentCalculateView calculate(MysteryBoxOrderInput mysteryBoxOrderInput, boolean autoCoupon, String retentionOrderId) {
        var baseOrder = mysteryBoxOrderInput.getBaseOrder();
        String userId = StpUtil.isLogin() ? StpUtil.getLoginIdAsString() : null;
        BigDecimal retentionDiscount = StringUtils.hasText(retentionOrderId)
                ? paymentRetentionService.claimedDiscount(retentionOrderId)
                : BigDecimal.ZERO;
        Payment produce = PaymentDraft.$.produce(draft -> {
            draft.setProductAmount(BigDecimal.ZERO)
                    .setDeliveryFee(BigDecimal.ZERO)
                    .setVipAmount(BigDecimal.ZERO)
                    .setCouponAmount(BigDecimal.ZERO);
            BigDecimal totalPrice = BigDecimal.ZERO;
            for (var item : mysteryBoxOrderInput.getItems()) {
                MysteryBox mysteryBox = mysteryBoxRepository.findById(item.getMysteryBoxId())
                        .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "盲盒不存在"));
                BigDecimal batchPrice = drawPackConfigService.applyBatchDiscount(
                        mysteryBox.price(),
                        item.getMysteryBoxCount()
                );
                BigDecimal price = newcomerBoxService.resolveLineProductAmount(
                        userId,
                        mysteryBox,
                        item.getMysteryBoxCount(),
                        batchPrice
                );
                totalPrice = totalPrice.add(price);
            }
            draft.setProductAmount(totalPrice);
            String couponUserId = baseOrder.getCouponUserId();
            if (autoCoupon && userId != null && !StringUtils.hasText(couponUserId)) {
                couponUserId = couponService.suggestBestCoupon(userId, totalPrice);
            }
            BigDecimal couponAmount = couponService.calculate(
                    StringUtils.hasText(couponUserId) ? couponUserId : null,
                    totalPrice
            );
            if (retentionDiscount.signum() > 0) {
                couponAmount = couponAmount.add(retentionDiscount);
            }
            draft.setCouponAmount(couponAmount);
            draft.setDeliveryFee(BigDecimal.ZERO);
            draft.setVipAmount(vipService.calculate(totalPrice));
            draft.setPayAmount(
                    draft.productAmount()
                            .add(draft.deliveryFee())
                            .subtract(draft.couponAmount())
                            .subtract(draft.vipAmount())
            );
        });
        String suggestedCouponUserId = null;
        BigDecimal savingsAmount = BigDecimal.ZERO;
        if (userId != null) {
            suggestedCouponUserId = couponService.suggestBestCoupon(userId, produce.productAmount());
            if (StringUtils.hasText(suggestedCouponUserId)) {
                savingsAmount = couponService.calculate(suggestedCouponUserId, produce.productAmount());
            }
        }
        return PaymentCalculateView.from(
                new PaymentPriceView(produce),
                retentionDiscount,
                suggestedCouponUserId,
                savingsAmount,
                marketProperties.getCurrency()
        );
    }

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

    private MysteryBoxOrder loadPayableOrder(String id) {
        MysteryBoxOrder mysteryBoxOrder = mysteryBoxOrderRepository.findByIdForFront(id);
        checkStatus(mysteryBoxOrder, ProductOrderStatus.TO_BE_PAID);
        checkOwner(mysteryBoxOrder);
        assertDrawModeBeforePayment(mysteryBoxOrder);
        paymentRetentionService.applyToOrderBeforePay(id);
        return mysteryBoxOrder;
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

    @Transactional
    public String paymentNotifyVNPay(Map<String, String> params) {
        Optional<PaymentNotifyResult> parsed = vnpayPaymentGateway.parsePaymentNotify(null, params);
        if (parsed.isEmpty()) {
            paymentMetrics.paymentNotifyRejected();
            return "RspCode=97&Message=Invalid signature";
        }
        PaymentNotifyResult result = parsed.get();
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
            paymentReliabilityService.recordPaymentEvent(null, result.orderId(), "notify", "fail", ex.getMessage(), 0);
            throw ex;
        }
        return VNPAY_NOTIFY_SUCCESS;
    }

    /**
     * 生成预支付参数
     * @param id 盲盒订单id
     * @return 微信预支付参数
     */
    @Transactional
    public WxPayUnifiedOrderV3Result.JsapiResult prepay(String id) {
        MysteryBoxOrder mysteryBoxOrder = mysteryBoxOrderRepository.findByIdForFront(id);
        checkStatus(mysteryBoxOrder, ProductOrderStatus.TO_BE_PAID);
        checkOwner(mysteryBoxOrder);
        assertDrawModeBeforePayment(mysteryBoxOrder);
        paymentRetentionService.applyToOrderBeforePay(id);
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
        if (!paymentNotifyLogService.tryBegin(outTradeNo, transactionId, "wechat", body)) {
            log.info("重复支付回调已忽略 orderId={}", outTradeNo);
            return WECHAT_NOTIFY_SUCCESS;
        }
        try {
            completeOrderAfterPayment(outTradeNo, transactionId, "notify");
            paymentNotifyLogService.markProcessed(outTradeNo, "wechat", body);
        } catch (Exception ex) {
            paymentMetrics.paymentFailure();
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
        MysteryBoxOrder mysteryBoxOrder = mysteryBoxOrderRepository.findByIdForFront(id);
        if (!mysteryBoxOrder.creator().id().equals(StpUtil.getLoginIdAsString())) {
            throw new BusinessException("只能支付自己的订单");
        }
        checkStatus(mysteryBoxOrder, ProductOrderStatus.TO_BE_PAID);
        assertDrawModeBeforePayment(mysteryBoxOrder);
        paymentRetentionService.applyToOrderBeforePay(id);
        String tradeNo = IdUtil.fastSimpleUUID();
        completeOrderAfterPayment(id, tradeNo, "mock");
        log.info("Mock 支付完成，orderId={}, tradeNo={}", id, tradeNo);
        return id;
    }

    private void completeOrderAfterPayment(String outTradeNo, String transactionId, String eventType) {
        MysteryBoxOrder mysteryBoxOrder = mysteryBoxOrderRepository.findByIdForFront(outTradeNo);
        if (!mysteryBoxOrder.status().equals(ProductOrderStatus.TO_BE_PAID)) {
            log.info("重复支付处理，忽略，orderId={}, status={}", mysteryBoxOrder.id(), mysteryBoxOrder.status());
            return;
        }
        StpUtil.switchTo(mysteryBoxOrder.creator().id());
        mysteryBoxOrder.items().forEach(mysteryBoxOrderItem -> {
            mysteryBoxRepository.consumePool(
                    mysteryBoxOrderItem.mysteryBoxId(),
                    mysteryBoxOrderItem.mysteryBoxCount()
            );
            boolean forceHigh = mysteryBoxUserPityService.shouldForceHigh(
                    mysteryBoxOrder.creator().id(),
                    mysteryBoxOrderItem.mysteryBoxId()
            );
            List<ProductView> generateProducts = prizeStockService.drawAndConsume(
                    mysteryBoxOrder.creator().id(),
                    mysteryBoxOrderItem.mysteryBoxId(),
                    mysteryBoxOrder.id(),
                    mysteryBoxOrderItem.mysteryBoxCount(),
                    forceHigh
            );
            mysteryBoxUserPityService.recordDrawResults(
                    mysteryBoxOrder.creator().id(),
                    mysteryBoxOrderItem.mysteryBoxId(),
                    generateProducts
            );
            String drawMode = orderDrawMetaService.getDrawMode(mysteryBoxOrder.id());
            if ("buyout".equalsIgnoreCase(drawMode)) {
                mysteryBoxDrawQueueService.releaseBuyoutLock(mysteryBoxOrderItem.mysteryBoxId(), mysteryBoxOrder.creator().id());
            }
            if ("queue".equalsIgnoreCase(drawMode)) {
                mysteryBoxDrawQueueService.leaveQueueForUser(
                        mysteryBoxOrderItem.mysteryBoxId(),
                        mysteryBoxOrder.creator().id()
                );
            }
            if ("cabinet".equalsIgnoreCase(drawMode)) {
                Integer slotNo = orderDrawMetaService.getSlotNo(mysteryBoxOrder.id());
                if (slotNo != null) {
                    mysteryBoxPoolSlotService.markSold(
                            mysteryBoxOrderItem.mysteryBoxId(),
                            slotNo,
                            mysteryBoxOrder.id()
                    );
                }
            }
            generateProducts = applyWinRuleIfPresent(
                    mysteryBoxOrder.creator().id(),
                    mysteryBoxOrder.id(),
                    mysteryBoxOrderItem.id(),
                    mysteryBoxOrderItem.mysteryBoxId(),
                    generateProducts
            );
            mysteryBoxOrderItemRepository.updateProducts(mysteryBoxOrderItem.id(), generateProducts);
        });
        paymentRepository.updatePayTimeAndTradeNo(mysteryBoxOrder.id(), transactionId, LocalDateTime.now());
        orderLogisticsService.recordPaid(mysteryBoxOrder.id());
        mysteryBoxOrderRepository.changeStatus(mysteryBoxOrder.id(), ProductOrderStatus.TO_BE_DELIVERED);
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
     * 从盲盒关联的商品中随机生成指定数量的商品，生成的概率是由商品品质决定
     * @param products 盲盒中的商品
     * @param count 购买的盲盒数量
     * @return 生成的商品列表
     */
    @Transactional
    public List<ProductView> generateProducts(String mysteryBoxId, List<Product> products, int count) {
        MysteryBox mysteryBox = mysteryBoxRepository.findById(mysteryBoxId)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "盲盒不存在"));
        int legendaryRate = mysteryBox.legendaryRate();
        int hiddenRate = mysteryBox.hiddenRate();
        int generalRate = mysteryBox.generalRate();
        if (legendaryRate + hiddenRate + generalRate != PROBABILITY_BASE) {
            throw new BusinessException(ResultCode.ParamSetIllegal, "盲盒中奖概率配置错误，总和必须为10000");
        }
        List<Product> legendaryList = products
                .stream()
                .filter(product -> product.qualityType().equals(DictConstants.QualityType.LEGENDARY))
                .toList();
        List<Product> hiddenList = products
                .stream()
                .filter(product -> product.qualityType().equals(DictConstants.QualityType.HIDDEN))
                .toList();
        List<Product> generalList = products
                .stream()
                .filter(product -> product.qualityType().equals(DictConstants.QualityType.GENERAL))
                .toList();
        int legendaryCount = 0;
        int hiddenCount = 0;
        int generalCount = 0;
        // 根据概率生成
        for (int i = 0; i < count; i++) {
            int randomInt = RandomUtil.randomInt(0, PROBABILITY_BASE);
            if (randomInt < legendaryRate) {
                legendaryCount++;
            } else if (randomInt < legendaryRate + hiddenRate) {
                hiddenCount++;
            } else {
                generalCount++;
            }
        }
        List<Product> generatedProducts = new ArrayList<>();
        generatedProducts.addAll(RandomUtil.randomEleList(legendaryList, legendaryCount));
        generatedProducts.addAll(RandomUtil.randomEleList(hiddenList, hiddenCount));
        generatedProducts.addAll(RandomUtil.randomEleList(generalList, generalCount));
        return generatedProducts.stream().map(ProductView::new).toList();
    }

    private List<ProductView> applyWinRuleIfPresent(String userId,
                                                    String mysteryBoxOrderId,
                                                    String mysteryBoxOrderItemId,
                                                    String mysteryBoxId,
                                                    List<ProductView> generatedProducts) {
        Optional<MysteryBoxWinRule> matchedRule = mysteryBoxWinRuleService.findFirstActiveRule(userId, mysteryBoxId);
        if (matchedRule.isEmpty()) {
            return generatedProducts;
        }
        MysteryBoxWinRule rule = matchedRule.get();
        Product designatedProduct = productRepository.findById(rule.productId())
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "指定中奖商品不存在"));
        List<ProductView> mutable = new ArrayList<>(generatedProducts);
        String originalProductId = mutable.isEmpty() ? "" : mutable.get(0).getId();
        ProductView designatedView = new ProductView(designatedProduct);
        if (mutable.isEmpty()) {
            mutable.add(designatedView);
        } else {
            mutable.set(0, designatedView);
        }
        mysteryBoxWinRuleService.consumeOne(rule);
        mysteryBoxWinRuleService.recordHit(
                rule.id(),
                userId,
                mysteryBoxOrderId,
                mysteryBoxOrderItemId,
                mysteryBoxId,
                originalProductId,
                designatedProduct.id(),
                rule.remark()
        );
        return mutable;
    }

    /**
     * 管理员在后台发货
     * @param id 订单id
     * @param trackingNumber 物流单号
     * @return 订单id
     */
    @Transactional
    public String deliver(String id, String trackingNumber) {
        return deliver(id, trackingNumber, "auto");
    }

    @Transactional
    public String deliver(String id, String trackingNumber, String carrierCode) {
        MysteryBoxOrder mysteryBoxOrder = mysteryBoxOrderRepository.findByIdForFront(id);
        checkStatus(mysteryBoxOrder, ProductOrderStatus.TO_BE_DELIVERED, ProductOrderStatus.TO_BE_RECEIVED);
        String tracking = trackingNumber.trim();
        String carrier = carrierCode == null || carrierCode.isBlank() ? "auto" : carrierCode.trim();
        baseOrderRepository.updateTrackingNumber(id, tracking);
        updateCarrierCode(id, carrier);
        orderLogisticsService.recordShipped(id, tracking);
        mysteryBoxOrderRepository.changeStatus(id, ProductOrderStatus.TO_BE_RECEIVED);
        userNotificationService.push(
                mysteryBoxOrder.creator().id(),
                "ORDER",
                "商品已发货",
                "物流单号 " + tracking + "，请注意查收",
                id
        );
        return id;
    }

    private void updateCarrierCode(String orderId, String carrierCode) {
        jdbcTemplate.update(
                "UPDATE base_order SET carrier_code = ? WHERE id = ?",
                carrierCode,
                orderId
        );
    }

    @Transactional
    public int batchDeliver(List<OrderLogisticsService.BatchShipLine> lines) {
        if (lines == null || lines.isEmpty()) {
            return 0;
        }
        int ok = 0;
        for (OrderLogisticsService.BatchShipLine line : lines) {
            if (line.orderId() == null || line.orderId().isBlank()
                    || line.trackingNumber() == null || line.trackingNumber().isBlank()) {
                continue;
            }
            try {
                deliver(line.orderId().trim(), line.trackingNumber().trim(), line.carrierCode());
                ok++;
            } catch (BusinessException ex) {
                log.warn("批量发货跳过 orderId={}, reason={}", line.orderId(), ex.getMessage());
            }
        }
        return ok;
    }

    /**
     * 用户确认收货
     */
    @Transactional
    public String confirmReceiveForUser(String id) {
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(id);
        checkOwner(order);
        checkStatus(order, ProductOrderStatus.TO_BE_RECEIVED);
        mysteryBoxOrderRepository.changeStatus(id, ProductOrderStatus.FINISHED);
        return id;
    }

    /**
     * 用户在移动端取消未支付的订单
     * @param id 订单id
     * @return 订单id
     */
    @Transactional
    public String unpaidCancelForUser(String id) {
        MysteryBoxOrder mysteryBoxOrder = mysteryBoxOrderRepository.findByIdForFront(id);
        checkStatus(mysteryBoxOrder, ProductOrderStatus.TO_BE_PAID);
        checkOwner(mysteryBoxOrder);
        mysteryBoxOrderRepository.changeStatus(mysteryBoxOrder.id(), ProductOrderStatus.CLOSED);
        // 优惠券设置为未使用
        if (mysteryBoxOrder.baseOrder().couponUser() != null) {
            couponService.changeStatus(mysteryBoxOrder.baseOrder().couponUser().id(), CouponUseStatus.UNUSED);
        }
        releaseCabinetSlotIfNeeded(mysteryBoxOrder.id());
        return mysteryBoxOrder.id();
    }

    private void releaseCabinetSlotIfNeeded(String orderId) {
        String drawMode = orderDrawMetaService.getDrawMode(orderId);
        if (!"cabinet".equalsIgnoreCase(drawMode)) {
            return;
        }
        Integer slotNo = orderDrawMetaService.getSlotNo(orderId);
        if (slotNo == null) {
            return;
        }
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(orderId);
        if (order.items().isEmpty()) {
            return;
        }
        mysteryBoxPoolSlotService.releaseByOrder(
                order.items().get(0).mysteryBoxId(),
                slotNo,
                order.creator().id()
        );
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
        if (ProductOrderStatus.TO_BE_DELIVERED.equals(mysteryBoxOrder.status())
                || ProductOrderStatus.TO_BE_RECEIVED.equals(mysteryBoxOrder.status())) {
            prizeStockService.rollbackByOrderId(id);
        }
        String refundOrderId = IdUtil.fastSimpleUUID();
        BigDecimal payAmount = mysteryBoxOrder.baseOrder().payment().payAmount();
        DictConstants.PayType payType = mysteryBoxOrder.baseOrder().payment().payType();
        RefundRecord refundRecord = RefundRecordDraft.$.produce(draft -> {
            draft.setId(refundOrderId);
            draft.setOrderId(id);
            draft.setAmount(payAmount);
            draft.setReason("退款");
            draft.setStatus(DictConstants.RefundStatus.REFUNDING);
        });
        if (payType == DictConstants.PayType.VN_PAY) {
            String tradeNo = mysteryBoxOrder.baseOrder().payment().tradeNo();
            Optional<PaymentRefundResult> refundResult = vnpayPaymentGateway.refund(
                    id,
                    tradeNo,
                    refundOrderId,
                    payAmount,
                    "127.0.0.1");
            PaymentRefundResult result = refundResult.orElseThrow(() -> new BusinessException("VNPay 退款失败"));
            if (!result.success()) {
                throw new BusinessException("VNPay 退款失败: " + result.message());
            }
            refundRecord = RefundRecordDraft.$.produce(refundRecord, draft -> draft
                    .setRefundId(result.gatewayRefundId())
                    .setStatus(DictConstants.RefundStatus.REFUNDING));
        } else {
            WxPayRefundV3Request wxPayRefundV3Request = new WxPayRefundV3Request()
                    .setOutTradeNo(id)
                    .setOutRefundNo(refundOrderId)
                    .setNotifyUrl(wxPayPropertiesExtension.getNotifyUrl() + "/front/mystery-box-order/notify/refund/wechat")
                    .setReason("退款")
                    .setAmount(new WxPayRefundV3Request.Amount()
                            .setRefund(payAmount.multiply(BigDecimal.valueOf(100)).intValue())
                            .setTotal(payAmount.multiply(BigDecimal.valueOf(100)).intValue())
                            .setCurrency("CNY"));
            WxPayRefundV3Result wxPayRefundV3Result = wxPayService.refundV3(wxPayRefundV3Request);
            refundRecord = RefundRecordDraft.$.produce(refundRecord, draft -> draft
                    .setRefundId(wxPayRefundV3Result.getRefundId())
                    .setRefundApplicationDetails(wxPayRefundV3Result)
                    .setStatus(DictConstants.RefundStatus.REFUNDING));
        }
        return refundRecordRepository.save(refundRecord).id();
    }

    @Transactional
    public java.math.BigDecimal redeemToBalance(String id) {
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(id);
        checkOwner(order);
        checkStatus(order, ProductOrderStatus.TO_BE_DELIVERED, ProductOrderStatus.TO_BE_RECEIVED);
        java.math.BigDecimal payCap = order.baseOrder().payment().payAmount();
        if (payCap == null || payCap.compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new BusinessException(ResultCode.ParamSetIllegal, "订单金额异常，无法兑换");
        }
        java.math.BigDecimal recoveryTotal = java.math.BigDecimal.ZERO;
        for (var line : order.items()) {
            List<ProductView> products = line.products();
            if (products == null || products.isEmpty()) {
                continue;
            }
            for (ProductView product : products) {
                if (product == null) {
                    continue;
                }
                recoveryTotal = recoveryTotal.add(redeemProperties.recoveryAmount(product.getPrice()));
            }
            mysteryBoxOrderItemRepository.updateProducts(line.id(), List.of());
        }
        java.math.BigDecimal amount = recoveryTotal.min(payCap);
        if (amount.compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new BusinessException(ResultCode.ParamSetIllegal, "订单金额异常，无法兑换");
        }
        userRepository.addBalance(order.creator().id(), amount);
        BigDecimal latestBalance = userRepository.findById(order.creator().id())
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "用户不存在"))
                .balance();
        UserBalanceLog balanceLog = UserBalanceLogDraft.$.produce(draft -> draft
                .setUserId(order.creator().id())
                .setChangeType("REDEEM_ORDER")
                .setAmount(amount)
                .setBalanceAfter(latestBalance)
                .setRelatedOrderId(id)
                .setRemark("盲盒奖品兑换余额"));
        userBalanceLogRepository.save(balanceLog);
        mysteryBoxOrderRepository.changeStatus(id, ProductOrderStatus.FINISHED);
        return amount;
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
        if (refundRecord.status().equals(DictConstants.RefundStatus.SUCCESS) || refundRecord.status().equals(DictConstants.RefundStatus.FAILED)) {
            log.info("重复退款回调，忽略后续处理，refundId={}, status={}", refundRecord.id(), refundRecord.status());
            return WECHAT_NOTIFY_SUCCESS;
        }
        MysteryBoxOrder mysteryBoxOrder = mysteryBoxOrderRepository.findByIdForFront(refundRecord.orderId());
        StpUtil.switchTo(mysteryBoxOrder.creator().id());
        if (result.getRefundStatus().equals("SUCCESS")) {
            prizeStockService.rollbackByOrderId(refundRecord.orderId());
            // 需要将订单回退到未支付状态再取消
            mysteryBoxOrderRepository.changeStatus(result.getOutTradeNo(), ProductOrderStatus.TO_BE_PAID);
            unpaidCancelForUser(result.getOutTradeNo());
            // 更新退款状态
            mysteryBoxOrderRepository.changeStatus(result.getOutTradeNo(), ProductOrderStatus.REFUNDED);
            // 生成退款记录
            RefundRecord produce = RefundRecordDraft.$.produce(refundRecord,
                    draft -> draft.setRefundNotifyDetails(result)
                            .setStatus(DictConstants.RefundStatus.SUCCESS));
            refundRecordRepository.save(produce);
        } else {
            RefundRecord produce = RefundRecordDraft.$.produce(refundRecord, draft -> draft
                    .setRefundNotifyDetails(result)
                    .setStatus(DictConstants.RefundStatus.FAILED));
            refundRecordRepository.save(produce);
        }
        return WECHAT_NOTIFY_SUCCESS;
    }


    public void checkStatus(MysteryBoxOrder mysteryBoxOrder, ProductOrderStatus... productOrderStatusList) {
        for (var status : productOrderStatusList) {
            if (mysteryBoxOrder.status().equals(status)) {
                return;
            }
        }
        throw new BusinessException(ResultCode.ParamSetIllegal, "订单状态不正确");
    }

    public void checkOwner(MysteryBoxOrder mysteryBoxOrder) {
        if (!mysteryBoxOrder.creator().id().equals(StpUtil.getLoginIdAsString())) {
            throw new BusinessException(ResultCode.ParamSetIllegal, "非本人操作");
        }
    }

    private void assertDrawModeBeforePayment(MysteryBoxOrder order) {
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

}