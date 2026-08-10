package io.github.qifan777.server.payment.config;

import lombok.Data;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "app.market")
public class MarketProperties {
    /** wechat | vnpay */
    private String paymentProvider = "wechat";
    /** ISO 4217 display currency for checkout quotes */
    private String currency = "CNY";
    /** full | local-only — when local-only, skip Kuaidi100 polling */
    private String logisticsMode = "full";

    @Value("${app.support.zalo-oa-id:}")
    private String supportZaloOaId;

    @Value("${app.default-locale:zh-CN}")
    private String defaultLocale;

    public boolean isVndMarket() {
        return "VND".equalsIgnoreCase(currency)
                || "vnpay".equalsIgnoreCase(paymentProvider);
    }

    public String currencySymbol() {
        return isVndMarket() ? "₫" : "¥";
    }

    public String formatAmount(java.math.BigDecimal amount) {
        if (amount == null) {
            return currencySymbol() + "0";
        }
        if (isVndMarket()) {
            return amount.stripTrailingZeros().toPlainString() + " ₫";
        }
        return "¥" + amount;
    }
}
