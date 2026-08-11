package io.github.qifan777.server.user.auth;

import cn.dev33.satoken.annotation.SaIgnore;
import cn.dev33.satoken.stp.SaTokenInfo;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Zalo OAuth login for mobile / web frontends.
 * <p>Exchanges {@code code} (+ optional {@code codeVerifier} for PKCE) via
 * {@code POST https://oauth.zaloapp.com/v4/access_token}, or accepts a ready {@code accessToken},
 * then loads profile from {@code GET https://graph.zalo.me/v2.0/me} and returns Sa-Token info.
 */
@RestController
@RequestMapping("front/auth/zalo")
@RequiredArgsConstructor
public class ZaloAuthForFrontController {

    private final ZaloProperties zaloProperties;
    private final ZaloAuthService zaloAuthService;

    @Value("${app.auth.zalo-enabled:false}")
    private boolean zaloEnabled;

    /** Public fields needed to start the Zalo permission redirect (app id is not secret). */
    @SaIgnore
    @GetMapping("config")
    public ZaloPublicConfig config() {
        boolean ready = zaloEnabled && zaloProperties.isConfigured();
        return new ZaloPublicConfig(
                ready,
                ready ? zaloProperties.resolveAppId() : null,
                "https://oauth.zaloapp.com/v4/permission"
        );
    }

    @SaIgnore
    @PostMapping("login")
    public SaTokenInfo login(@RequestBody(required = false) ZaloLoginRequest body,
                             @RequestHeader(value = "x-device-id", required = false) String deviceId) {
        if (!zaloEnabled || !zaloProperties.isConfigured()) {
            throw new BusinessException("ZALO_LOGIN_NOT_CONFIGURED: Zalo login is not configured");
        }
        return zaloAuthService.login(body, deviceId);
    }

    public record ZaloLoginRequest(String accessToken, String code, String codeVerifier, String inviteCode) {
    }

    public record ZaloPublicConfig(boolean enabled, String appId, String authorizationUrl) {
    }
}
