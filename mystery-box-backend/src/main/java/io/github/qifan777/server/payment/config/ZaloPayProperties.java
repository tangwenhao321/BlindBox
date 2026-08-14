package io.github.qifan777.server.payment.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * ZaloPay config — used by the <b>unwired</b> marketplace payout stub only.
 * No checkout gateway exists yet. Production keeps {@code zalopay.enabled=false} /
 * {@code stub=true} / {@code partner-wired=false} ({@code application-prod-vn.yml}).
 */
@Data
@Component
@ConfigurationProperties(prefix = "zalopay")
public class ZaloPayProperties {
    private boolean enabled;
    private boolean stub = true;
    /**
     * Flip only after Partner disbursement HTTP is implemented.
     * ProductionSafetyValidator refuses {@code true} until then.
     */
    private boolean partnerWired = false;
    private String appId = "";
    private String key1 = "";
    private String key2 = "";

    public boolean isConfigured() {
        return StringUtils.hasText(appId)
                && StringUtils.hasText(key1)
                && StringUtils.hasText(key2);
    }

    /**
     * Always false until Partner disbursement is implemented.
     * Credentials + {@code stub=false} alone must not advertise readiness
     * ({@link io.github.qifan777.server.marketplace.payout.ZaloPayMarketplacePayoutGateway#isReady()} is also hard-false).
     */
    public boolean isDisbursementReady() {
        return false;
    }
}
