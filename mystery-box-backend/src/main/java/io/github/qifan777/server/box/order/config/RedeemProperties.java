package io.github.qifan777.server.box.order.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Data
@Component
@ConfigurationProperties(prefix = "app.redeem")
public class RedeemProperties {
    /** Fraction of product display price returned as balance (e.g. 0.35 = 35%). */
    private BigDecimal balanceRate = new BigDecimal("0.35");
    /** Minimum recovery amount per item when product price is missing. */
    private BigDecimal minAmount = BigDecimal.ONE;

    public BigDecimal recoveryAmount(BigDecimal productPrice) {
        if (productPrice == null || productPrice.compareTo(BigDecimal.ZERO) <= 0) {
            return minAmount.max(BigDecimal.ZERO);
        }
        BigDecimal rate = balanceRate == null || balanceRate.compareTo(BigDecimal.ZERO) <= 0
                ? new BigDecimal("0.35")
                : balanceRate;
        BigDecimal raw = productPrice.multiply(rate).setScale(2, RoundingMode.HALF_UP);
        if (raw.compareTo(minAmount) < 0) {
            return minAmount;
        }
        return raw;
    }
}
