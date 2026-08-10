package io.github.qifan777.server.payment.entity.dto;

import io.github.qifan777.server.payment.entity.Payment;
import io.github.qifan777.server.payment.entity.PaymentDraft;

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
    public static PaymentCalculateView from(PaymentPriceView price, BigDecimal retentionDiscount) {
        return from(price, retentionDiscount, null, null, "CNY");
    }

    public static PaymentCalculateView from(
            PaymentPriceView price,
            BigDecimal retentionDiscount,
            String suggestedCouponUserId,
            BigDecimal savingsAmount
    ) {
        return from(price, retentionDiscount, suggestedCouponUserId, savingsAmount, "CNY");
    }

    public static PaymentCalculateView from(
            PaymentPriceView price,
            BigDecimal retentionDiscount,
            String suggestedCouponUserId,
            BigDecimal savingsAmount,
            String currency
    ) {
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
                currency == null || currency.isBlank() ? "CNY" : currency
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
