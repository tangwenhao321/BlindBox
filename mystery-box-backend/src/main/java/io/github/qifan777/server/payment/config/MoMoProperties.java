package io.github.qifan777.server.payment.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Data
@Component
@ConfigurationProperties(prefix = "momo")
public class MoMoProperties {
    private boolean enabled;
    /**
     * True while Partner API is not wired (deeplink stub only).
     * Production must keep {@code enabled=false} while stub remains true.
     */
    private boolean stub = true;
    /**
     * Flip only after Partner create / IPN HMAC / query / refund HTTP clients exist.
     * ProductionSafetyValidator refuses {@code true} until those are implemented.
     */
    private boolean partnerWired = false;
    private String partnerCode = "";
    private String accessKey = "";
    private String secretKey = "";
    private String returnUrl = "mysterybox://payment-return";

    public boolean isConfigured() {
        return StringUtils.hasText(partnerCode)
                && StringUtils.hasText(accessKey)
                && StringUtils.hasText(secretKey);
    }

    /**
     * Whether MoMo may be advertised / offered to clients as a live checkout option.
     * Credentials + {@code stub=false} alone are insufficient — Partner must be wired.
     */
    public boolean isCheckoutOffered() {
        return enabled && isConfigured() && !stub && partnerWired;
    }
}
