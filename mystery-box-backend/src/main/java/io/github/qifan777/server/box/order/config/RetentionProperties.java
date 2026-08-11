package io.github.qifan777.server.box.order.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Data
@Component
@ConfigurationProperties(prefix = "app.retention")
public class RetentionProperties {
    /**
     * Flat discount, or max cap when {@link #discountPercent} is set.
     * When null, defaults by {@code app.market.currency} (VND → 10000, otherwise CNY → 5).
     */
    private BigDecimal discountAmount;

    /**
     * Optional percent of payable (0–100). When &gt; 0, discount = min(pay × percent/100, max).
     * Max defaults to {@link #discountAmount} / currency default.
     */
    private BigDecimal discountPercent;

    /**
     * Hard cap when percent-based. When null, falls back to {@link #discountAmount} default.
     */
    private BigDecimal maxDiscountAmount;

    /**
     * Max abandon-offer claims per user per calendar day (market timezone).
     * 0 disables claiming.
     */
    private int maxClaimsPerUserPerDay = 1;
}
