package io.github.qifan777.server.user.auth;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Zalo Social OAuth credentials.
 * <p>YAML keys (preferred): {@code zalo.client-id}, {@code zalo.client-secret}.
 * Aliases {@code zalo.app-id} / {@code zalo.app-secret} are also accepted.
 */
@Data
@Component
@ConfigurationProperties(prefix = "zalo")
public class ZaloProperties {
    /** App ID — maps from {@code zalo.client-id} or {@code zalo.app-id}. */
    private String clientId = "";
    private String clientSecret = "";
    private String appId = "";
    private String appSecret = "";

    /** Token endpoint: {@code POST https://oauth.zaloapp.com/v4/access_token} */
    private String tokenUrl = "https://oauth.zaloapp.com/v4/access_token";

    /** Profile endpoint: {@code GET https://graph.zalo.me/v2.0/me} */
    private String profileUrl = "https://graph.zalo.me/v2.0/me";

    public String resolveAppId() {
        return StringUtils.hasText(clientId) ? clientId.trim() : (appId == null ? "" : appId.trim());
    }

    public String resolveAppSecret() {
        return StringUtils.hasText(clientSecret) ? clientSecret.trim()
                : (appSecret == null ? "" : appSecret.trim());
    }

    public boolean isConfigured() {
        return StringUtils.hasText(resolveAppId()) && StringUtils.hasText(resolveAppSecret());
    }
}
