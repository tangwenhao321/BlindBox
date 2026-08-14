package io.github.qifan777.server.box.order.service;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.box.order.config.RetentionProperties;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.dict.model.PayType;
import io.github.qifan777.server.dict.model.ProductOrderStatus;
import io.github.qifan777.server.infrastructure.money.MoneyRounding;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.payment.entity.Payment;
import io.github.qifan777.server.payment.entity.PaymentDraft;
import io.github.qifan777.server.payment.gateway.MoMoPaymentGateway;
import io.github.qifan777.server.payment.gateway.VNPayPaymentGateway;
import io.github.qifan777.server.payment.repository.PaymentRepository;
import io.github.qifan777.server.payment.service.WeChatPayService;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentRetentionService {
    public static final String RETENTION_OFFER_CODE = "RETENTION_OFFER";

    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final PaymentRepository paymentRepository;
    private final JdbcTemplate jdbcTemplate;
    private final MarketProperties marketProperties;
    private final RetentionProperties retentionProperties;
    private final VNPayPaymentGateway vnpayPaymentGateway;
    private final MoMoPaymentGateway momoPaymentGateway;
    private final WeChatPayService weChatPayService;

    public record AbandonOfferView(
            boolean granted,
            BigDecimal discountAmount,
            String message,
            BigDecimal payAmount
    ) {
        public AbandonOfferView(boolean granted, BigDecimal discountAmount, String message) {
            this(granted, discountAmount, message, null);
        }
    }

    public record Eligibility(
            boolean eligible,
            boolean claimed,
            BigDecimal offerDiscount,
            BigDecimal claimedDiscount,
            String blockReason
    ) {
    }

    /** Flat / currency default (also used as percent cap when max not set). */
    public BigDecimal resolveFlatDiscountAmount() {
        String currency = marketProperties.getCurrency();
        BigDecimal configured = retentionProperties.getDiscountAmount();
        if (configured != null && configured.signum() > 0) {
            return MoneyRounding.round(configured, currency);
        }
        if (marketProperties.isVndMarket()) {
            return MoneyRounding.round(new BigDecimal("10000"), currency);
        }
        return MoneyRounding.round(new BigDecimal("5"), currency);
    }

    /** @deprecated use {@link #resolveFlatDiscountAmount()} or {@link #resolveDiscountForPayAmount(BigDecimal)} */
    public BigDecimal resolveDiscountAmount() {
        return resolveFlatDiscountAmount();
    }

    public BigDecimal resolveDiscountForPayAmount(BigDecimal payAmount) {
        String currency = marketProperties.getCurrency();
        int scale = MoneyRounding.scaleForCurrency(currency);
        BigDecimal payable = payAmount == null ? BigDecimal.ZERO : payAmount.max(BigDecimal.ZERO);
        BigDecimal flatOrCap = resolveFlatDiscountAmount();
        BigDecimal percent = retentionProperties.getDiscountPercent();
        if (percent != null && percent.signum() > 0) {
            BigDecimal fromPct = payable
                    .multiply(percent)
                    .divide(new BigDecimal("100"), scale, RoundingMode.HALF_UP);
            BigDecimal max = retentionProperties.getMaxDiscountAmount();
            if (max == null || max.signum() <= 0) {
                max = flatOrCap;
            } else {
                max = MoneyRounding.round(max, currency);
            }
            return MoneyRounding.round(fromPct.min(max).max(BigDecimal.ZERO), currency);
        }
        return MoneyRounding.round(flatOrCap.min(payable).max(BigDecimal.ZERO), currency);
    }

    public ZoneId marketZone() {
        return marketProperties.isVndMarket()
                ? ZoneId.of("Asia/Ho_Chi_Minh")
                : ZoneId.of("Asia/Shanghai");
    }

    public Eligibility evaluateEligibility(String orderId, String userId, MysteryBoxOrder order) {
        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM order_payment_retention_claim WHERE order_id = ?",
                Integer.class,
                orderId
        );
        if (exists != null && exists > 0) {
            BigDecimal claimed = claimedDiscountRaw(orderId);
            return new Eligibility(false, true, claimed, claimed, "ALREADY_CLAIMED");
        }
        int dailyMax = Math.max(0, retentionProperties.getMaxClaimsPerUserPerDay());
        if (dailyMax <= 0) {
            return new Eligibility(false, false, resolveFlatDiscountAmount(), BigDecimal.ZERO, "DISABLED");
        }
        LocalDate claimDate = LocalDate.now(marketZone());
        // Advisory only — claim path enforces quota via tryConsumeDailyQuota (unique slots).
        Integer todayCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM order_payment_retention_daily WHERE user_id = ? AND claim_date = ?",
                Integer.class,
                userId,
                claimDate
        );
        if (todayCount != null && todayCount >= dailyMax) {
            return new Eligibility(false, false, resolveFlatDiscountAmount(), BigDecimal.ZERO, "DAILY_LIMIT");
        }
        if (!ProductOrderStatus.TO_BE_PAID.equals(order.status())) {
            return new Eligibility(false, false, resolveFlatDiscountAmount(), BigDecimal.ZERO, "DISABLED");
        }
        BigDecimal payAmount = order.baseOrder().payment().payAmount();
        payAmount = payAmount == null ? BigDecimal.ZERO : payAmount;
        BigDecimal discount = resolveDiscountForPayAmount(payAmount);
        if (discount.signum() <= 0 || payAmount.compareTo(discount) <= 0) {
            return new Eligibility(false, false, discount, BigDecimal.ZERO, "AMOUNT_TOO_LOW");
        }
        return new Eligibility(true, false, discount, BigDecimal.ZERO, null);
    }

    @Transactional
    public AbandonOfferView claimAbandonOffer(String orderId) {
        String userId = StpUtil.getLoginIdAsString();
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(orderId);
        if (!order.creator().id().equals(userId)) {
            throw new BusinessException("无权操作订单");
        }
        if (!ProductOrderStatus.TO_BE_PAID.equals(order.status())) {
            throw new BusinessException("仅待支付订单可领取挽留优惠");
        }
        Eligibility eligibility = evaluateEligibility(orderId, userId, order);
        if (!eligibility.eligible()) {
            BigDecimal currentPay = order.baseOrder().payment().payAmount();
            return new AbandonOfferView(
                    false,
                    BigDecimal.ZERO,
                    RETENTION_OFFER_CODE + ":" + eligibility.blockReason(),
                    currentPay
            );
        }

        BigDecimal payAmount = order.baseOrder().payment().payAmount();
        payAmount = payAmount == null ? BigDecimal.ZERO : payAmount;
        BigDecimal discount = eligibility.offerDiscount();

        if (!tryConsumeDailyQuota(userId, orderId)) {
            return new AbandonOfferView(false, BigDecimal.ZERO, RETENTION_OFFER_CODE + ":DAILY_LIMIT", payAmount);
        }

        try {
            jdbcTemplate.update(
                    "INSERT INTO order_payment_retention_claim (order_id, user_id, discount_amount, claimed_time) VALUES (?,?,?,?)",
                    orderId,
                    userId,
                    discount,
                    LocalDateTime.now()
            );
        } catch (DuplicateKeyException ex) {
            // Release daily slot reserved above so a same-order race does not burn quota.
            jdbcTemplate.update("DELETE FROM order_payment_retention_daily WHERE order_id = ?", orderId);
            return new AbandonOfferView(false, BigDecimal.ZERO, RETENTION_OFFER_CODE + ":ALREADY_CLAIMED", payAmount);
        }

        BigDecimal newPay = applyDiscountToPayment(orderId, discount);
        String formatted = marketProperties.formatAmount(discount);
        return new AbandonOfferView(true, discount, RETENTION_OFFER_CODE + ":" + formatted, newPay);
    }

    /**
     * Atomically reserve a daily slot. Concurrent claims across different orders cannot both succeed
     * when slots are exhausted (PK on user_id + claim_date + slot).
     */
    private boolean tryConsumeDailyQuota(String userId, String orderId) {
        int dailyMax = Math.max(0, retentionProperties.getMaxClaimsPerUserPerDay());
        if (dailyMax <= 0) {
            return false;
        }
        LocalDate claimDate = LocalDate.now(marketZone());
        for (int slot = 0; slot < dailyMax; slot++) {
            try {
                jdbcTemplate.update(
                        "INSERT INTO order_payment_retention_daily (user_id, claim_date, slot, order_id, created_time) VALUES (?,?,?,?,?)",
                        userId,
                        claimDate,
                        slot,
                        orderId,
                        LocalDateTime.now()
                );
                return true;
            } catch (DuplicateKeyException ignored) {
                // slot taken — try next
            }
        }
        return false;
    }

    public BigDecimal claimedDiscountForOwner(String orderId) {
        if (orderId == null || orderId.isBlank()) {
            return BigDecimal.ZERO;
        }
        String userId = StpUtil.isLogin() ? StpUtil.getLoginIdAsString() : null;
        if (userId == null) {
            return BigDecimal.ZERO;
        }
        List<BigDecimal> amounts = jdbcTemplate.query(
                """
                        SELECT c.discount_amount
                        FROM order_payment_retention_claim c
                        INNER JOIN mystery_box_order o ON o.id = c.order_id
                        WHERE c.order_id = ? AND c.user_id = ? AND o.status = ?
                        LIMIT 1
                        """,
                (rs, rowNum) -> rs.getBigDecimal("discount_amount"),
                orderId,
                userId,
                "TO_BE_PAID"
        );
        return amounts.isEmpty() ? BigDecimal.ZERO : amounts.get(0);
    }

    public BigDecimal claimedDiscountRaw(String orderId) {
        List<BigDecimal> amounts = jdbcTemplate.query(
                "SELECT discount_amount FROM order_payment_retention_claim WHERE order_id = ? LIMIT 1",
                (rs, rowNum) -> rs.getBigDecimal(1),
                orderId
        );
        return amounts.isEmpty() ? BigDecimal.ZERO : amounts.get(0);
    }

    /** @deprecated use {@link #claimedDiscountForOwner(String)} */
    public BigDecimal claimedDiscount(String orderId) {
        return claimedDiscountForOwner(orderId);
    }

    @Transactional
    public void applyToOrderBeforePay(String orderId) {
        BigDecimal discount = claimedDiscountForOwner(orderId);
        if (discount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        applyDiscountToPayment(orderId, discount);
    }

    /**
     * True when IPN amount matches current payAmount, or the pre-retention amount
     * (stale checkout URL opened before claim). Overpay after claim is accepted.
     * MoMo Partner uses major VND; VNPay/WeChat use ×100 minor units.
     */
    public boolean matchesPayAmountAllowingStalePrepay(String orderId, Long amountMinor, BigDecimal currentPay) {
        PayType payType = resolvePayType(orderId);
        if (matchesGatewayAmount(payType, amountMinor, currentPay)) {
            return true;
        }
        BigDecimal claimed = claimedDiscountRaw(orderId);
        if (claimed.signum() <= 0 || currentPay == null) {
            return false;
        }
        return matchesGatewayAmount(payType, amountMinor, currentPay.add(claimed));
    }

    public boolean isStalePrepayOverpay(String orderId, Long amountMinor, BigDecimal currentPay) {
        PayType payType = resolvePayType(orderId);
        if (matchesGatewayAmount(payType, amountMinor, currentPay)) {
            return false;
        }
        BigDecimal claimed = claimedDiscountRaw(orderId);
        if (claimed.signum() <= 0 || currentPay == null) {
            return false;
        }
        return matchesGatewayAmount(payType, amountMinor, currentPay.add(claimed));
    }

    private boolean matchesGatewayAmount(PayType payType, Long amountMinor, BigDecimal payAmount) {
        if (payType == null) {
            return false;
        }
        if (payType == PayType.MO_MO) {
            return momoPaymentGateway.matchesPayAmount(amountMinor, payAmount);
        }
        return vnpayPaymentGateway.matchesPayAmount(amountMinor, payAmount);
    }

    private PayType resolvePayType(String orderId) {
        try {
            MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(orderId);
            if (order.baseOrder() != null
                    && order.baseOrder().payment() != null
                    && order.baseOrder().payment().payType() != null) {
                return order.baseOrder().payment().payType();
            }
            return null;
        } catch (Exception ex) {
            // Fail closed: unknown pay type must not use VNPay ×100 matcher against MoMo major VND.
            log.warn("resolvePayType failed orderId={}: {}", orderId, ex.getMessage());
            return null;
        }
    }

    /**
     * User paid the pre-claim amount via a stale checkout URL. Align local payAmount to gateway
     * capture so later refunds do not under-refund, and reverse the unused retention coupon.
     */
    @Transactional
    public void reconcileStaleOverpay(String orderId, BigDecimal gatewayPaidAmount) {
        if (gatewayPaidAmount == null || gatewayPaidAmount.signum() <= 0) {
            return;
        }
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(orderId);
        if (!ProductOrderStatus.TO_BE_PAID.equals(order.status())) {
            return;
        }
        Payment payment = order.baseOrder().payment();
        BigDecimal currentPay = payment.payAmount() == null ? BigDecimal.ZERO : payment.payAmount();
        if (gatewayPaidAmount.compareTo(currentPay) <= 0) {
            return;
        }
        BigDecimal claimed = claimedDiscountRaw(orderId);
        BigDecimal currentCoupon = payment.couponAmount() == null ? BigDecimal.ZERO : payment.couponAmount();
        BigDecimal newCoupon = currentCoupon.subtract(claimed).max(BigDecimal.ZERO);
        String currency = marketProperties.getCurrency();
        paymentRepository.save(PaymentDraft.$.produce(payment, draft -> draft
                .setPayAmount(MoneyRounding.round(gatewayPaidAmount, currency))
                .setCouponAmount(MoneyRounding.round(newCoupon, currency))));
        invalidateAllPrepayCaches(orderId);
    }

    private BigDecimal applyDiscountToPayment(String orderId, BigDecimal discount) {
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(orderId);
        if (!ProductOrderStatus.TO_BE_PAID.equals(order.status())) {
            return null;
        }
        int marked = jdbcTemplate.update(
                "UPDATE order_payment_retention_claim SET applied_time = ? WHERE order_id = ? AND applied_time IS NULL",
                LocalDateTime.now(),
                orderId
        );
        if (marked == 0) {
            return order.baseOrder().payment().payAmount();
        }
        Payment payment = order.baseOrder().payment();
        BigDecimal currentPay = payment.payAmount() == null ? BigDecimal.ZERO : payment.payAmount();
        BigDecimal currentCoupon = payment.couponAmount() == null ? BigDecimal.ZERO : payment.couponAmount();
        String currency = marketProperties.getCurrency();
        BigDecimal payAmount = MoneyRounding.round(currentPay.subtract(discount).max(BigDecimal.ZERO), currency);
        BigDecimal couponAmount = MoneyRounding.round(currentCoupon.add(discount), currency);
        paymentRepository.save(PaymentDraft.$.produce(payment, draft -> draft
                .setCouponAmount(couponAmount)
                .setPayAmount(payAmount)));
        invalidateAllPrepayCaches(orderId);
        return payAmount;
    }

    private void invalidateAllPrepayCaches(String orderId) {
        vnpayPaymentGateway.invalidatePrepayCache(orderId);
        weChatPayService.invalidatePrepayCache(orderId);
        momoPaymentGateway.invalidatePrepayCache(orderId);
    }
}
