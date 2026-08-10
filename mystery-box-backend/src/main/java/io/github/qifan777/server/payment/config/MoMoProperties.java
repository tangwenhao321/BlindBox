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
    private String partnerCode = "";
    private String accessKey = "";
    private String secretKey = "";
    private String returnUrl = "mysterybox://payment-return";

    public boolean isConfigured() {
        return StringUtils.hasText(partnerCode)
                && StringUtils.hasText(accessKey)
                && StringUtils.hasText(secretKey);
    }
}
