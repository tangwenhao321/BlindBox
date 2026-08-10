package io.github.qifan777.server.box.order.service;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.dict.model.DictConstants.ProductOrderStatus;
import io.github.qifan777.server.payment.entity.Payment;
import io.github.qifan777.server.payment.entity.PaymentDraft;
import io.github.qifan777.server.payment.repository.PaymentRepository;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentRetentionService {
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final PaymentRepository paymentRepository;
    private final JdbcTemplate jdbcTemplate;

    public record AbandonOfferView(
            boolean granted,
            BigDecimal discountAmount,
            String message
    ) {
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
        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM order_payment_retention_claim WHERE order_id = ?",
                Integer.class,
                orderId
        );
        if (exists != null && exists > 0) {
            return new AbandonOfferView(false, BigDecimal.ZERO, "已领取过挽留优惠");
        }
        jdbcTemplate.update(
                "INSERT INTO order_payment_retention_claim (order_id, user_id, discount_amount, claimed_time) VALUES (?,?,?,?)",
                orderId,
                userId,
                new BigDecimal("5.00"),
                LocalDateTime.now()
        );
        return new AbandonOfferView(true, new BigDecimal("5.00"), "已发放 ¥5 挽留优惠，返回支付时将自动抵扣");
    }

    public BigDecimal claimedDiscount(String orderId) {
        List<BigDecimal> amounts = jdbcTemplate.query(
                "SELECT discount_amount FROM order_payment_retention_claim WHERE order_id = ? LIMIT 1",
                (rs, rowNum) -> rs.getBigDecimal("discount_amount"),
                orderId
        );
        return amounts.isEmpty() ? BigDecimal.ZERO : amounts.get(0);
    }

    @Transactional
    public void applyToOrderBeforePay(String orderId) {
        BigDecimal discount = claimedDiscount(orderId);
        if (discount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(orderId);
        if (!ProductOrderStatus.TO_BE_PAID.equals(order.status())) {
            return;
        }
        Payment payment = order.baseOrder().payment();
        BigDecimal payAmount = payment.payAmount().subtract(discount).max(BigDecimal.ZERO);
        paymentRepository.save(PaymentDraft.$.produce(payment, draft -> draft
                .setCouponAmount(payment.couponAmount().add(discount))
                .setPayAmount(payAmount)));
    }
}
