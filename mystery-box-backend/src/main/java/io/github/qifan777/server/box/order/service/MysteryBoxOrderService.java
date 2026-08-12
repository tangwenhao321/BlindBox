package io.github.qifan777.server.box.order.service;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.IdUtil;
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
import io.github.qifan777.server.box.item.entity.MysteryBoxOrderItem;
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
import io.github.qifan777.server.box.draw.service.DrawFairnessService;
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
import io.github.qifan777.server.infrastructure.error.MoneyPathErrorCode;
import io.github.qifan777.server.infrastructure.model.WxPayPropertiesExtension;
import io.github.qifan777.server.infrastructure.money.MoneyRounding;
import io.github.qifan777.server.order.repository.BaseOrderRepository;
import io.github.qifan777.server.payment.entity.Payment;
import io.github.qifan777.server.payment.entity.PaymentDraft;
import io.github.qifan777.server.payment.entity.dto.PaymentCalculateView;
import io.github.qifan777.server.payment.entity.dto.PaymentPriceView;
import io.github.qifan777.server.payment.model.WeChatPayModel;
import io.github.qifan777.server.payment.repository.PaymentRepository;
import io.github.qifan777.server.ops.service.AnalyticsEventService;
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
import io.github.qifan777.server.refund.service.RefundRecordService;
import io.github.qifan777.server.user.compliance.MinorProtectionService;
import io.github.qifan777.server.user.compliance.UserComplianceService;
import io.github.qifan777.server.user.compliance.UserSpendLimitService;
import io.github.qifan777.server.user.root.service.UserWalletService;
import io.github.qifan777.server.vip.root.service.VipService;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;

import jakarta.annotation.PostConstruct;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import static io.github.qifan777.server.dict.model.DictConstants.*;

@Service
@Slf4j
@RequiredArgsConstructor
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
    private final AddressRepository addressRepository;
    private final BaseOrderRepository baseOrderRepository;
    private final MysteryBoxRepository mysteryBoxRepository;
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final MysteryBoxOrderItemRepository mysteryBoxOrderItemRepository;
    private final PaymentRepository paymentRepository;
    private final RefundRecordRepository refundRecordRepository;
    private final RefundRecordService refundRecordService;
    private final PaymentReliabilityService paymentReliabilityService;
    private final AnalyticsEventService analyticsEventService;
    private final PaymentNotifyLogService paymentNotifyLogService;
    private final NewcomerBoxService newcomerBoxService;
    private final ReferralService referralService;
    private final DrawPackConfigService drawPackConfigService;
    private final PrizeStockService prizeStockService;
    private final MysteryBoxUserPityService mysteryBoxUserPityService;
    private final MysteryBoxDrawQueueService mysteryBoxDrawQueueService;
    private final MysteryBoxPoolSlotService mysteryBoxPoolSlotService;
    private final OrderDrawMetaService orderDrawMetaService;
    private final DrawFairnessService drawFairnessService;
    private final OrderLogisticsService orderLogisticsService;
    private final PurchaseLimitService purchaseLimitService;
    private final UserComplianceService userComplianceService;
    private final UserSpendLimitService userSpendLimitService;
    private final MinorProtectionService minorProtectionService;
    private final UserNotificationService userNotificationService;
    private final PaymentRetentionService paymentRetentionService;
    private final PaymentMetrics paymentMetrics;
    private final JdbcTemplate jdbcTemplate;
    private final MarketProperties marketProperties;
    private final PaymentGatewayRegistry paymentGatewayRegistry;
    private final VNPayPaymentGateway vnpayPaymentGateway;
    private final MoMoPaymentGateway momoPaymentGateway;
    private final RedeemProperties redeemProperties;
    private final UserWalletService userWalletService;
    private final PlatformTransactionManager transactionManager;
    /** Lazy to avoid cycle with WarehouseShipService → MysteryBoxOrderService. */
    private final ObjectProvider<io.github.qifan777.server.warehouse.WarehouseShipService> warehouseShipService;

    @Value("${app.fairness.allow-win-rule-override:false}")
    private boolean allowWinRuleOverride;

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
        return create(mysteryBoxOrderInput, drawMode, slotNo, null, null);
    }

    @Transactional
    public String create(MysteryBoxOrderInput mysteryBoxOrderInput, String drawMode, Integer slotNo,
                         String recommendVariant) {
        return create(mysteryBoxOrderInput, drawMode, slotNo, recommendVariant, null);
    }

    /**
     * @param recommendVariant optional A/B variant from home recommend carousel (header {@code x-recommend-variant}
     *                         or query {@code recommendVariant}). Persisted via analytics_event ORDER_CREATED
     *                         (no order meta JSON column).
     * @param clientFairnessNonce optional client entropy mixed into fairness commit (header {@code x-client-fairness-nonce}).
     */
    @Transactional
    public String create(MysteryBoxOrderInput mysteryBoxOrderInput, String drawMode, Integer slotNo,
                         String recommendVariant, String clientFairnessNonce) {
        String userId = StpUtil.getLoginIdAsString();
        userComplianceService.assertAgeConfirmed(userId);
        minorProtectionService.assertPurchaseAllowed(userId);
        String mode = drawMode == null ? "instant" : drawMode;
        for (var item : mysteryBoxOrderInput.getItems()) {
            purchaseLimitService.assertWithinDailyLimit(userId, item.getMysteryBoxId(), item.getMysteryBoxCount());
            newcomerBoxService.assertCanPurchase(userId, item.getMysteryBoxId());
            prizeStockService.assertStockAvailable(item.getMysteryBoxId(), item.getMysteryBoxCount());
            mysteryBoxRepository.assertPoolAvailable(item.getMysteryBoxId(), item.getMysteryBoxCount());
            assertPityHighStockAvailable(userId, item.getMysteryBoxId());
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
            // Reserve pool units at create so concurrent unpaid orders cannot oversell.
            mysteryBoxRepository.consumePool(item.getMysteryBoxId(), item.getMysteryBoxCount());
        }
        String orderId = OrderIds.next();
        DrawFairnessService.FairnessToken fairness =
                drawFairnessService.issue(userId, null, orderId, clientFairnessNonce);
        orderDrawMetaService.saveFairnessSeed(orderId, fairness.seed(), fairness.commit());
        orderDrawMetaService.markPoolReserved(orderId);
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
        List<String> snapshotBoxIds = mysteryBoxOrderInput.getItems().stream()
                .map(item -> item.getMysteryBoxId())
                .distinct()
                .toList();
        Map<String, MysteryBox> snapshotBoxMap = mysteryBoxRepository
                .findByIds(snapshotBoxIds, MysteryBoxRepository.COMPLEX_FETCHER_FOR_FRONT)
                .stream()
                .collect(Collectors.toMap(MysteryBox::id, Function.identity(), (a, b) -> a));
        MysteryBoxOrder entity = Objects.createMysteryBoxOrder(mysteryBoxOrderInput
                        .toEntity(),
                draft -> {
                    // 设置订单项关联的订单id，并且设置盲盒快照
                    draft.setItems(draft
                            .items()
                            .stream()
                            .map(item -> Objects.createMysteryBoxOrderItem(item, mysteryBoxOrderItemDraft -> {
                                MysteryBox box = Optional.ofNullable(snapshotBoxMap.get(item.mysteryBoxId()))
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
        recordOrderCreatedAnalytics(userId, orderId, mysteryBoxOrderInput, mode, recommendVariant);
        return save.id();
    }

    private void recordOrderCreatedAnalytics(String userId, String orderId, MysteryBoxOrderInput input,
                                             String drawMode, String recommendVariant) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("orderId", orderId);
            payload.put("drawMode", drawMode == null ? "instant" : drawMode);
            if (input.getItems() != null && !input.getItems().isEmpty()) {
                var first = input.getItems().get(0);
                payload.put("boxId", first.getMysteryBoxId());
                payload.put("count", first.getMysteryBoxCount());
            }
            if (StringUtils.hasText(recommendVariant)) {
                payload.put("variant", recommendVariant.trim());
                payload.put("recommendVariant", recommendVariant.trim());
            }
            analyticsEventService.recordServerEvent("ORDER_CREATED", userId, payload);
        } catch (Exception ex) {
            log.warn("ORDER_CREATED analytics failed orderId={}", orderId, ex);
        }
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
        // retentionOrderId kept for API compatibility; discount is original-order only (claim/prepay).
        BigDecimal retentionDiscount = BigDecimal.ZERO;
        Payment produce = PaymentDraft.$.produce(draft -> {
            draft.setProductAmount(BigDecimal.ZERO)
                    .setDeliveryFee(BigDecimal.ZERO)
                    .setVipAmount(BigDecimal.ZERO)
                    .setCouponAmount(BigDecimal.ZERO);
            BigDecimal totalPrice = BigDecimal.ZERO;
            List<String> boxIds = mysteryBoxOrderInput.getItems().stream()
                    .map(item -> item.getMysteryBoxId())
                    .distinct()
                    .toList();
            Map<String, MysteryBox> boxMap = mysteryBoxRepository.findByIds(boxIds).stream()
                    .collect(Collectors.toMap(MysteryBox::id, Function.identity(), (a, b) -> a));
            for (var item : mysteryBoxOrderInput.getItems()) {
                MysteryBox mysteryBox = Optional.ofNullable(boxMap.get(item.getMysteryBoxId()))
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
            // Cap coupon to product; VIP on remainder; never go negative.
            BigDecimal product = draft.productAmount();
            BigDecimal couponCapped = couponAmount.max(BigDecimal.ZERO).min(product);
            draft.setCouponAmount(couponCapped);
            draft.setDeliveryFee(BigDecimal.ZERO);
            BigDecimal afterCoupon = product.add(draft.deliveryFee()).subtract(couponCapped);
            BigDecimal vipAmount = vipService.calculate(afterCoupon).max(BigDecimal.ZERO).min(afterCoupon);
            draft.setVipAmount(MoneyRounding.round(vipAmount, marketProperties.getCurrency()));
            draft.setCouponAmount(MoneyRounding.round(couponCapped, marketProperties.getCurrency()));
            draft.setProductAmount(MoneyRounding.round(product, marketProperties.getCurrency()));
            draft.setPayAmount(MoneyRounding.round(
                    afterCoupon.subtract(vipAmount).max(BigDecimal.ZERO),
                    marketProperties.getCurrency()));
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
        // Fail fast before gateway charge when pity forceHigh has no high-tier stock.
        for (var item : mysteryBoxOrder.items()) {
            assertPityHighStockAvailable(mysteryBoxOrder.creator().id(), item.mysteryBoxId());
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

    private void assertPityHighStockAvailable(String userId, String mysteryBoxId) {
        if (!mysteryBoxUserPityService.shouldForceHigh(userId, mysteryBoxId)) {
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

    private static void throwPityStockExhausted() {
        throw new BusinessException(
                MoneyPathErrorCode.PITY_STOCK_EXHAUSTED,
                MoneyPathErrorCode.PITY_STOCK_EXHAUSTED.tokenMessage()
        );
    }

    private static boolean isPityStockExhausted(Throwable ex) {
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
        loadPayableOrder(id);
        String tradeNo = IdUtil.fastSimpleUUID();
        completeOrderAfterPayment(id, tradeNo, "mock");
        log.info("Mock 支付完成，orderId={}, tradeNo={}", id, tradeNo);
        return id;
    }

    private void completeOrderAfterPayment(String outTradeNo, String transactionId, String eventType) {
        MysteryBoxOrder mysteryBoxOrder = mysteryBoxOrderRepository.findByIdForFront(outTradeNo);
        if (mysteryBoxOrder.status().equals(ProductOrderStatus.CLOSED)) {
            // Unpaid auto-cancel already released pool; gateway capture arrived late — refund, do not draw.
            handlePaidAfterCancel(mysteryBoxOrder, transactionId, eventType);
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
            boolean poolAlreadyReserved = orderDrawMetaService.isPoolReserved(mysteryBoxOrder.id());
            mysteryBoxOrder.items().forEach(mysteryBoxOrderItem -> {
                if (!poolAlreadyReserved) {
                    // Legacy orders created before create-time reserve.
                    mysteryBoxRepository.consumePool(
                            mysteryBoxOrderItem.mysteryBoxId(),
                            mysteryBoxOrderItem.mysteryBoxCount()
                    );
                }
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
                int paidCount = mysteryBoxOrderItem.mysteryBoxCount();
                generateProducts = applyWinRuleIfPresent(
                        mysteryBoxOrder.creator().id(),
                        mysteryBoxOrder.id(),
                        mysteryBoxOrderItem.id(),
                        mysteryBoxOrderItem.mysteryBoxId(),
                        generateProducts
                );
                // Pity ignores free lastOne (appended after paidCount) so terminal prize does not reset/inflate streaks.
                List<ProductView> pitySlice = generateProducts.size() > paidCount
                        ? generateProducts.subList(0, paidCount)
                        : generateProducts;
                mysteryBoxUserPityService.recordDrawResults(
                        mysteryBoxOrder.creator().id(),
                        mysteryBoxOrderItem.mysteryBoxId(),
                        pitySlice
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
                                mysteryBoxOrder.id(),
                                mysteryBoxOrder.creator().id()
                        );
                    }
                }
                mysteryBoxOrderItemRepository.updateProducts(mysteryBoxOrderItem.id(), generateProducts);
            });
            // Pool units were consumed at create; after successful draw they are final — do not restore on cancel.
            orderDrawMetaService.clearPoolReserved(mysteryBoxOrder.id());
        } catch (BusinessException ex) {
            if (isPityStockExhausted(ex)) {
                // Nested draw txn marked this txn rollback-only; refund after rollback so it commits.
                String orderId = mysteryBoxOrder.id();
                String userId = mysteryBoxOrder.creator().id();
                for (var item : mysteryBoxOrder.items()) {
                    mysteryBoxUserPityService.markCompensatePending(userId, item.mysteryBoxId());
                }
                if ("mock".equalsIgnoreCase(eventType)) {
                    throwPityStockExhausted();
                }
                final String txId = transactionId;
                final String evt = eventType;
                if (org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive()) {
                    org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                            new org.springframework.transaction.support.TransactionSynchronization() {
                                @Override
                                public void afterCompletion(int status) {
                                    try {
                                        executePityStockGatewayRefund(orderId, txId, evt);
                                    } catch (Exception refundEx) {
                                        log.error("Pity stock auto-refund after rollback failed orderId={}",
                                                orderId, refundEx);
                                        try {
                                            ensurePityRefundingTicket(orderId);
                                        } catch (Exception ensureEx) {
                                            log.error("Pity refund ticket ensure failed orderId={}",
                                                    orderId, ensureEx);
                                        }
                                    }
                                }
                            });
                } else {
                    executePityStockGatewayRefund(orderId, txId, evt);
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
            throwPityStockExhausted();
        }
        executePityStockGatewayRefund(mysteryBoxOrder.id(), transactionId, eventType);
    }

    /**
     * User paid after unpaid cancel closed the order. Auto-refund capture; never open a draw.
     */
    private void handlePaidAfterCancel(MysteryBoxOrder mysteryBoxOrder, String transactionId, String eventType) {
        String orderId = mysteryBoxOrder.id();
        if (refundRecordRepository.existsRefundingOrSuccess(orderId)) {
            log.info("Paid-after-cancel already refunding/refunded orderId={}", orderId);
            return;
        }
        log.warn("Paid after cancel — auto refund orderId={} eventType={}", orderId, eventType);
        requiresNewTransaction.executeWithoutResult(status ->
                doExecutePaidAfterCancelRefund(orderId, transactionId, eventType));
    }

    private void doExecutePaidAfterCancelRefund(String orderId, String transactionId, String eventType) {
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
            draft.setStatus(DictConstants.RefundStatus.REFUNDING);
        });
        DictConstants.PayType payType = mysteryBoxOrder.baseOrder().payment().payType();
        boolean vnPayChannel = refundRecordService.isVnPayChannel(payType);
        boolean refundSettled = false;
        try {
            if (refundRecordService.isMoMoRefundUnsupported(payType)) {
                refundRecordRepository.save(refundRecord);
                log.warn("Paid-after-cancel MoMo refund ticket kept REFUNDING orderId={}", orderId);
            } else if (paymentMockEnabled || (!vnPayChannel && isWxUnset())) {
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
                        "127.0.0.1",
                        preferredVnPayTxnTime(mysteryBoxOrder));
                PaymentRefundResult result = refundResult.orElseThrow(() -> new BusinessException("VNPay 退款失败"));
                if (!result.success()) {
                    throw new BusinessException("VNPay 退款失败: " + result.message());
                }
                refundRecordService.finalizeLocalRefundSuccess(
                        refundRecord, mysteryBoxOrder, result.gatewayRefundId(), false);
                refundSettled = true;
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
                        .setStatus(DictConstants.RefundStatus.REFUNDING));
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

    private void executePityStockGatewayRefund(String orderId, String transactionId, String eventType) {
        requiresNewTransaction.executeWithoutResult(status -> doExecutePityStockGatewayRefund(orderId, transactionId, eventType));
    }

    /** Best-effort REFUNDING row so reconcile can retry when outer refund blew up before save. */
    private void ensurePityRefundingTicket(String orderId) {
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
                draft.setStatus(DictConstants.RefundStatus.REFUNDING);
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

    private void doExecutePityStockGatewayRefund(String orderId, String transactionId, String eventType) {
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
            draft.setStatus(DictConstants.RefundStatus.REFUNDING);
        });
        DictConstants.PayType payType = mysteryBoxOrder.baseOrder().payment().payType();
        boolean vnPayChannel = refundRecordService.isVnPayChannel(payType);
        boolean refundSettled = false;
        try {
            // Align with RefundRecordService.approve: never wallet-credit VN_PAY when wx is unset.
            if (refundRecordService.isMoMoRefundUnsupported(payType)) {
                refundRecordRepository.save(refundRecord);
                mysteryBoxOrderRepository.changeStatus(orderId, ProductOrderStatus.CLOSED);
                log.warn("Pity MoMo refund ticket kept REFUNDING orderId={}", orderId);
            } else if (paymentMockEnabled || (!vnPayChannel && isWxUnset())) {
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
                        "127.0.0.1",
                        preferredVnPayTxnTime(mysteryBoxOrder));
                PaymentRefundResult result = refundResult.orElseThrow(() -> new BusinessException("VNPay 退款失败"));
                if (!result.success()) {
                    throw new BusinessException("VNPay 退款失败: " + result.message());
                }
                refundRecordService.finalizeLocalRefundSuccess(
                        refundRecord, mysteryBoxOrder, result.gatewayRefundId(), false);
                refundSettled = true;
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
                        .setStatus(DictConstants.RefundStatus.REFUNDING));
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

    private boolean isWxUnset() {
        return wxMchId == null || wxMchId.isBlank() || wxMchId.contains("local") || wxMchId.contains("xxxx");
    }

    /**
     * @deprecated Replaced by {@link PrizeStockService#drawAndConsume}. Kept only to fail loudly if still referenced.
     */
    @Deprecated
    @Transactional
    public List<ProductView> generateProducts(String mysteryBoxId, List<Product> products, int count) {
        throw new UnsupportedOperationException(
                "generateProducts is deprecated; use PrizeStockService.drawAndConsume");
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
        if (!allowWinRuleOverride) {
            log.info(
                    "Win-rule overwrite skipped (app.fairness.allow-win-rule-override=false): ruleId={}, userId={}, mysteryBoxId={}",
                    matchedRule.get().id(),
                    userId,
                    mysteryBoxId
            );
            return generatedProducts;
        }
        MysteryBoxWinRule rule = matchedRule.get();
        Product designatedProduct = productRepository.findById(rule.productId())
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "指定中奖商品不存在"));
        String originalProductId = generatedProducts.isEmpty() ? "" : generatedProducts.get(0).getId();
        List<ProductView> mutable = prizeStockService.swapDesignatedPrize(
                mysteryBoxId,
                generatedProducts,
                designatedProduct.id()
        );
        if (!mysteryBoxWinRuleService.consumeOneAtomic(rule)) {
            // Race: restore by reversing swap if consume failed
            if (!originalProductId.isBlank() && !originalProductId.equals(designatedProduct.id())) {
                prizeStockService.swapDesignatedPrize(mysteryBoxId, mutable, originalProductId);
            }
            log.warn("Win-rule consume raced out: ruleId={}, orderId={}", rule.id(), mysteryBoxOrderId);
            return generatedProducts;
        }
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
        releasePoolReservationIfNeeded(mysteryBoxOrder);
        return mysteryBoxOrder.id();
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
        String refundOrderId = IdUtil.fastSimpleUUID();
        BigDecimal payAmount = mysteryBoxOrder.baseOrder().payment().payAmount();
        DictConstants.PayType payType = mysteryBoxOrder.baseOrder().payment().payType();
        boolean vnPayChannel = refundRecordService.isVnPayChannel(payType);
        RefundRecord refundRecord = RefundRecordDraft.$.produce(draft -> {
            draft.setId(refundOrderId);
            draft.setOrderId(id);
            draft.setAmount(payAmount);
            draft.setReason("退款");
            draft.setStatus(DictConstants.RefundStatus.REFUNDING);
        });
        if (refundRecordService.isMoMoRefundUnsupported(payType)) {
            refundRecordRepository.save(refundRecord);
            throw new BusinessException("MoMo 退款通道未开通，已保留退款工单请人工处理");
        }
        boolean walletOrMock = paymentMockEnabled || (!vnPayChannel && isWxUnset());
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
                    "127.0.0.1",
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
                .setStatus(DictConstants.RefundStatus.REFUNDING));
        return refundRecordRepository.save(refundRecord).id();
    }

    @Transactional
    public java.math.BigDecimal redeemToBalance(String id) {
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(id);
        checkOwner(order);
        userComplianceService.assertAgeConfirmed(StpUtil.getLoginIdAsString());
        checkStatus(order, ProductOrderStatus.TO_BE_DELIVERED, ProductOrderStatus.TO_BE_RECEIVED);
        java.math.BigDecimal payCap = order.baseOrder().payment().payAmount();
        if (payCap == null || payCap.compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new BusinessException(
                    MoneyPathErrorCode.PAYMENT_AMOUNT_MISMATCH,
                    MoneyPathErrorCode.PAYMENT_AMOUNT_MISMATCH.tokenMessage("订单金额异常，无法兑换"));
        }
        java.math.BigDecimal recoveryTotal = java.math.BigDecimal.ZERO;
        for (var line : order.items()) {
            MysteryBoxOrderItem locked = mysteryBoxOrderItemRepository.findByIdWithProductsForUpdate(line.id())
                    .orElse(null);
            if (locked == null) {
                continue;
            }
            List<ProductView> products = locked.products();
            if (products == null || products.isEmpty()) {
                continue;
            }
            for (ProductView product : products) {
                if (product == null) {
                    continue;
                }
                recoveryTotal = recoveryTotal.add(
                        redeemProperties.recoveryAmount(product.getPrice(), marketProperties.getCurrency()));
            }
            mysteryBoxOrderItemRepository.updateProducts(line.id(), List.of());
        }
        java.math.BigDecimal amount = recoveryTotal.min(payCap);
        if (amount.compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new BusinessException(
                    MoneyPathErrorCode.PAYMENT_AMOUNT_MISMATCH,
                    MoneyPathErrorCode.PAYMENT_AMOUNT_MISMATCH.tokenMessage("订单金额异常，无法兑换"));
        }
        userWalletService.credit(
                order.creator().id(),
                amount,
                "REDEEM_ORDER",
                "盲盒奖品兑换余额",
                id
        );
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
            // Align with approve/reconcile: CAS claimSuccess + clawback + coupon restore.
            refundRecordRepository.save(RefundRecordDraft.$.produce(refundRecord, draft -> draft
                    .setRefundNotifyDetails(result)));
            refundRecordService.finalizeLocalRefundSuccess(refundRecord, mysteryBoxOrder, result.getRefundId());
        } else {
            RefundRecord produce = RefundRecordDraft.$.produce(refundRecord, draft -> draft
                    .setRefundNotifyDetails(result)
                    .setStatus(DictConstants.RefundStatus.FAILED));
            refundRecordRepository.save(produce);
        }
        return WECHAT_NOTIFY_SUCCESS;
    }


    private void cancelPendingWarehouseShips(String orderId) {
        try {
            io.github.qifan777.server.warehouse.WarehouseShipService shipService = warehouseShipService.getIfAvailable();
            if (shipService != null) {
                shipService.cancelPendingForOrder(orderId);
            }
        } catch (Exception ex) {
            log.warn("cancelPendingForOrder failed orderId={}", orderId, ex);
        }
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
            throw new BusinessException(
                    MoneyPathErrorCode.ORDER_OWNERSHIP_DENIED,
                    MoneyPathErrorCode.ORDER_OWNERSHIP_DENIED.tokenMessage("非本人操作"));
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

    private static LocalDateTime preferredVnPayTxnTime(MysteryBoxOrder order) {
        if (order.baseOrder() != null
                && order.baseOrder().payment() != null
                && order.baseOrder().payment().payTime() != null) {
            return order.baseOrder().payment().payTime();
        }
        return order.createdTime();
    }

}