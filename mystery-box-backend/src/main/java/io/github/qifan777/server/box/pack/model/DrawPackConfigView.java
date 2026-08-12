package io.github.qifan777.server.box.pack.model;

import io.github.qifan777.server.infrastructure.money.MoneyRounding;

import java.math.BigDecimal;
import java.math.RoundingMode;

public record DrawPackConfigView(
        String id,
        int drawCount,
        String label,
        int discountRate,
        boolean enabled,
        int sortOrder
) {
    public BigDecimal applyDiscount(BigDecimal unitPrice, String currency) {
        BigDecimal original = unitPrice.multiply(BigDecimal.valueOf(drawCount));
        int scale = MoneyRounding.scaleForCurrency(currency);
        BigDecimal discounted = original.multiply(BigDecimal.valueOf(discountRate))
                .divide(BigDecimal.valueOf(10000), Math.max(scale, 4), RoundingMode.HALF_UP);
        return MoneyRounding.round(discounted, currency);
    }

    public BigDecimal discountAmount(BigDecimal unitPrice, String currency) {
        BigDecimal original = MoneyRounding.round(
                unitPrice.multiply(BigDecimal.valueOf(drawCount)),
                currency
        );
        return MoneyRounding.round(original.subtract(applyDiscount(unitPrice, currency)), currency);
    }
}
