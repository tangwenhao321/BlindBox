package io.github.qifan777.server.payment;

import io.github.qifan777.server.payment.entity.dto.PaymentCalculateView;
import io.github.qifan777.server.payment.entity.dto.PaymentPriceView;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class PaymentCalculateViewTest {

    @Test
    void fromMapsPriceFieldsAndRetention() {
        PaymentPriceView price = new PaymentPriceView();
        price.setProductAmount(new BigDecimal("100.00"));
        price.setDeliveryFee(new BigDecimal("8.00"));
        price.setCouponAmount(new BigDecimal("13.00"));
        price.setVipAmount(new BigDecimal("2.00"));
        price.setPayAmount(new BigDecimal("93.00"));

        PaymentCalculateView view = PaymentCalculateView.from(price, new BigDecimal("5.00"));

        assertThat(view.productAmount()).isEqualByComparingTo("100.00");
        assertThat(view.deliveryFee()).isEqualByComparingTo("8.00");
        assertThat(view.couponAmount()).isEqualByComparingTo("13.00");
        assertThat(view.vipAmount()).isEqualByComparingTo("2.00");
        assertThat(view.payAmount()).isEqualByComparingTo("93.00");
        assertThat(view.retentionDiscount()).isEqualByComparingTo("5.00");
        assertThat(view.suggestedCouponUserId()).isNull();
        assertThat(view.savingsAmount()).isEqualByComparingTo("0");
    }

    @Test
    void fromMapsSuggestedCouponFields() {
        PaymentPriceView price = new PaymentPriceView();
        price.setProductAmount(new BigDecimal("100.00"));
        price.setDeliveryFee(BigDecimal.ZERO);
        price.setCouponAmount(BigDecimal.ZERO);
        price.setVipAmount(BigDecimal.ZERO);
        price.setPayAmount(new BigDecimal("100.00"));

        PaymentCalculateView view = PaymentCalculateView.from(
                price,
                BigDecimal.ZERO,
                "coupon-user-1",
                new BigDecimal("12.00")
        );

        assertThat(view.suggestedCouponUserId()).isEqualTo("coupon-user-1");
        assertThat(view.savingsAmount()).isEqualByComparingTo("12.00");
    }

    @Test
    void toEntityRebuildsPaymentDraft() {
        PaymentCalculateView view = new PaymentCalculateView(
                new BigDecimal("50"),
                new BigDecimal("6"),
                new BigDecimal("10"),
                BigDecimal.ZERO,
                new BigDecimal("46"),
                new BigDecimal("5"),
                "coupon-1",
                new BigDecimal("10"),
                "CNY"
        );
        assertThat(view.toEntity().payAmount()).isEqualByComparingTo("46");
        assertThat(view.toEntity().couponAmount()).isEqualByComparingTo("10");
    }
}
