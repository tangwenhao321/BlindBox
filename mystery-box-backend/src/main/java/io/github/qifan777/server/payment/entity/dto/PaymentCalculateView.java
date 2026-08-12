package io.github.qifan777.server.payment.entity.dto;

import io.github.qifan777.server.payment.entity.Payment;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;

/**
 * Price breakdown for checkout, including optional retention coupon line.
 */
public record PaymentCalculateView(
        BigDecimal productAmount,
        BigDecimal deliveryFee,
        BigDecimal couponAmount,
        BigDecimal vipAmount,
        BigDecimal payAmount,
        BigDecimal retentionDiscount,
        String suggestedCouponUserId,
        BigDecimal savingsAmount,
        String currency
) {
    public static PaymentCalculateView from(
            PaymentPriceView price,
            BigDecimal retentionDiscount,
            String currency
    ) {
        return from(price, retentionDiscount, null, null, currency);
    }

    public static PaymentCalculateView from(
            PaymentPriceView price,
            BigDecimal retentionDiscount,
            String suggestedCouponUserId,
            BigDecimal savingsAmount,
            String currency
    ) {
        if (!StringUtils.hasText(currency)) {
            throw new IllegalArgumentException("currency is required for PaymentCalculateView");
        }
        BigDecimal retention = retentionDiscount == null ? BigDecimal.ZERO : retentionDiscount;
        BigDecimal savings = savingsAmount == null ? BigDecimal.ZERO : savingsAmount;
        return new PaymentCalculateView(
                price.getProductAmount(),
                price.getDeliveryFee(),
                price.getCouponAmount(),
                price.getVipAmount(),
                price.getPayAmount(),
                retention,
                suggestedCouponUserId,
                savings,
                currency.trim()
        );
    }

    public Payment toEntity() {
        PaymentPriceView view = new PaymentPriceView();
        view.setProductAmount(productAmount);
        view.setCouponAmount(couponAmount);
        view.setDeliveryFee(deliveryFee);
        view.setVipAmount(vipAmount);
        view.setPayAmount(payAmount);
        return view.toEntity();
    }
}
