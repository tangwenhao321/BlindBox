package io.github.qifan777.server.box.pack.model;

import java.math.BigDecimal;

public record DrawPackConfigView(
        String id,
        int drawCount,
        String label,
        int discountRate,
        boolean enabled,
        int sortOrder
) {
    public BigDecimal applyDiscount(BigDecimal unitPrice) {
        BigDecimal original = unitPrice.multiply(BigDecimal.valueOf(drawCount));
        return original.multiply(BigDecimal.valueOf(discountRate))
                .divide(BigDecimal.valueOf(10000), 2, java.math.RoundingMode.HALF_UP);
    }

    public BigDecimal discountAmount(BigDecimal unitPrice) {
        BigDecimal original = unitPrice.multiply(BigDecimal.valueOf(drawCount));
        return original.subtract(applyDiscount(unitPrice));
    }
}
