package io.github.qifan777.server.box.order.service;

import io.github.qifan777.server.dict.model.ProductOrderStatus;
import io.github.qifan777.server.dict.model.CouponUseStatus;
import io.github.qifan777.server.dict.model.OrderType;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.Immutables;
import io.github.qifan777.server.address.entity.Address;
import io.github.qifan777.server.address.entity.dto.AddressView;
import io.github.qifan777.server.address.repository.AddressRepository;
import io.github.qifan777.server.box.order.OrderIds;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.entity.dto.MysteryBoxOrderInput;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.pack.service.DrawPackConfigService;
import io.github.qifan777.server.box.product.service.PrizeStockService;
import io.github.qifan777.server.box.queue.service.MysteryBoxDrawQueueService;
import io.github.qifan777.server.box.draw.service.DrawFairnessService;
import io.github.qifan777.server.logistics.service.OrderLogisticsService;
import io.github.qifan777.server.box.root.entity.MysteryBox;
import io.github.qifan777.server.box.root.entity.dto.MystryBoxView;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.box.root.service.NewcomerBoxService;
import io.github.qifan777.server.box.slot.service.MysteryBoxPoolSlotService;
import io.github.qifan777.server.ops.service.AnalyticsEventService;
import io.github.qifan777.server.coupon.root.service.CouponService;
import io.github.qifan777.server.infrastructure.money.MoneyRounding;
import io.github.qifan777.server.payment.entity.Payment;
import io.github.qifan777.server.payment.entity.PaymentDraft;
import io.github.qifan777.server.payment.entity.dto.PaymentCalculateView;
import io.github.qifan777.server.payment.entity.dto.PaymentPriceView;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.payment.gateway.PaymentGatewayRegistry;
import io.github.qifan777.server.payment.metrics.PaymentMetrics;
import io.github.qifan777.server.user.compliance.MinorProtectionService;
import io.github.qifan777.server.user.compliance.UserComplianceService;
import io.github.qifan777.server.user.compliance.UserSpendLimitService;
import io.github.qifan777.server.vip.root.service.VipService;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import static io.github.qifan777.server.dict.model.DictConstants.*;

/**
 * Order create / price-calculate flows extracted from {@link MysteryBoxOrderService}.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MysteryBoxOrderCreateService {
    private final CouponService couponService;
    private final VipService vipService;
    private final AddressRepository addressRepository;
    private final MysteryBoxRepository mysteryBoxRepository;
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final NewcomerBoxService newcomerBoxService;
    private final DrawPackConfigService drawPackConfigService;
    private final PrizeStockService prizeStockService;
    private final MysteryBoxDrawQueueService mysteryBoxDrawQueueService;
    private final MysteryBoxPoolSlotService mysteryBoxPoolSlotService;
    private final OrderDrawMetaService orderDrawMetaService;
    private final DrawFairnessService drawFairnessService;
    private final OrderLogisticsService orderLogisticsService;
    private final PurchaseLimitService purchaseLimitService;
    private final UserComplianceService userComplianceService;
    private final UserSpendLimitService userSpendLimitService;
    private final MinorProtectionService minorProtectionService;
    private final AnalyticsEventService analyticsEventService;
    private final PaymentMetrics paymentMetrics;
    private final MarketProperties marketProperties;
    private final PaymentGatewayRegistry paymentGatewayRegistry;
    private final MysteryBoxOrderPrepayService prepayService;

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
            prepayService.assertPityHighStockAvailable(
                    userId, item.getMysteryBoxId(), item.getMysteryBoxCount());
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
        MysteryBoxOrder entity = Immutables.createMysteryBoxOrder(mysteryBoxOrderInput
                        .toEntity(),
                draft -> {
                    // 设置订单项关联的订单id，并且设置盲盒快照
                    draft.setItems(draft
                            .items()
                            .stream()
                            .map(item -> Immutables.createMysteryBoxOrderItem(item, mysteryBoxOrderItemDraft -> {
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

    void recordOrderCreatedAnalytics(String userId, String orderId, MysteryBoxOrderInput input,
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
}
