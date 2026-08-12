package io.github.qifan777.server.box.order.config;

import io.github.qifan777.server.infrastructure.money.MoneyRounding;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Data
@Component
@ConfigurationProperties(prefix = "app.redeem")
public class RedeemProperties {
    /** Fraction of product display price returned as balance (e.g. 0.35 = 35%). */
    private BigDecimal balanceRate = new BigDecimal("0.35");
    /**
     * Minimum recovery amount per item when product price is missing.
     * Must be denominated in {@code app.payment.market.currency} (VND integer ₫, not CNY yuan).
     */
    private BigDecimal minAmount = BigDecimal.ONE;

    public BigDecimal recoveryAmount(BigDecimal productPrice, String currency) {
        if (!StringUtils.hasText(currency)) {
            throw new IllegalArgumentException("currency is required for redeem recoveryAmount");
        }
        String cur = currency.trim().toUpperCase();
        BigDecimal configured = minAmount == null ? BigDecimal.ZERO : minAmount.max(BigDecimal.ZERO);
        // VND has no fractional subunit — never allow sub-dong floors from CNY-style configs.
        if ("VND".equals(cur) && configured.compareTo(BigDecimal.ONE) < 0 && configured.compareTo(BigDecimal.ZERO) > 0) {
            configured = BigDecimal.ONE;
        }
        BigDecimal floor = MoneyRounding.round(configured, cur);
        if (productPrice == null || productPrice.compareTo(BigDecimal.ZERO) <= 0) {
            return floor;
        }
        BigDecimal rate = balanceRate == null || balanceRate.compareTo(BigDecimal.ZERO) <= 0
                ? new BigDecimal("0.35")
                : balanceRate;
        int scale = MoneyRounding.scaleForCurrency(cur);
        BigDecimal raw = productPrice.multiply(rate).setScale(scale, RoundingMode.HALF_UP);
        if (raw.compareTo(floor) < 0) {
            return floor;
        }
        return MoneyRounding.round(raw, cur);
    }
}
