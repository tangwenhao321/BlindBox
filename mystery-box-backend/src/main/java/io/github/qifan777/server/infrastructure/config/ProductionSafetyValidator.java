package io.github.qifan777.server.infrastructure.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;

/**
 * Fails fast when production profile is active but unsafe defaults remain.
 */
@Component
@Slf4j
public class ProductionSafetyValidator {
    private static final Set<String> DEFAULT_OTP_PLACEHOLDERS = Set.of(
            "CHANGE_ME_IN_PRIVATE_YML",
            "CHANGE_ME_DEV_OTP",
            "CHANGE_ME_STRONG_OTP"
    );

    private static final Set<String> IDENTITY_HASH_PLACEHOLDERS = Set.of(
            "CHANGE_ME",
            "CHANGE_ME_IDENTITY_HASH_SECRET",
            "placeholder",
            "IDENTITY_HASH_SECRET"
    );

    @Value("${payment.mock-enabled:false}")
    private boolean paymentMockEnabled;

    @Value("${security.admin-action-otp:}")
    private String adminActionOtp;

    @Value("${app.cors.allowed-origin-patterns:*}")
    private String corsAllowedOriginPatterns;

    @Value("${sms.provider:none}")
    private String smsProvider;

    @Value("${sms.vn-esms.api-key:}")
    private String vnEsmsApiKey;

    @Value("${sms.vn-esms.secret-key:}")
    private String vnEsmsSecretKey;

    @Value("${sms.vn-esms.partner-wired:false}")
    private boolean vnEsmsPartnerWired;

    @Value("${app.auth.zalo-enabled:false}")
    private boolean zaloEnabled;

    @Value("${app.identity.trust-local-verification:false}")
    private boolean trustLocalVerification;

    @Value("${security.compliance.minor.verification-required:false}")
    private boolean minorVerificationRequired;

    @Value("${app.auth.allow-mock-otp:false}")
    private boolean allowMockOtp;

    @Value("${app.market.payment-provider:wechat}")
    private String marketPaymentProvider;

    @Value("${vnpay.tmn-code:}")
    private String vnpayTmnCode;

    @Value("${vnpay.hash-secret:}")
    private String vnpayHashSecret;

    @Value("${vnpay.ipn-url:}")
    private String vnpayIpnUrl;

    @Value("${vnpay.return-url:}")
    private String vnpayReturnUrl;

    @Value("${vnpay.sandbox:false}")
    private boolean vnpaySandbox;

    @Value("${app.marketplace.payout-gateway:wallet}")
    private String marketplacePayoutGateway;

    @Value("${momo.enabled:false}")
    private boolean momoEnabled;

    @Value("${momo.partner-wired:false}")
    private boolean momoPartnerWired;

    @Value("${zalopay.enabled:false}")
    private boolean zaloPayEnabled;

    @Value("${zalopay.partner-wired:false}")
    private boolean zaloPayPartnerWired;

    @Value("${security.compliance.identity.hash-secret:}")
    private String identityHashSecret;

    @Value("${app.identity.provider:local}")
    private String identityProvider;

    @Value("${wx.pay.mch-id:}")
    private String wxPayMchId;

    @Value("${app.logistics.partner-wired:false}")
    private boolean logisticsPartnerWired;

    @Value("${security.idempotency.required:false}")
    private boolean idempotencyRequired;

    @Value("${security.sse.require-auth:false}")
    private boolean sseRequireAuth;

    @Value("${security.rate-limit.distributed:false}")
    private boolean rateLimitDistributed;

    private final Environment environment;

    public ProductionSafetyValidator(Environment environment) {
        this.environment = environment;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void validateProductionSafety() {
        if (!isProductionProfile()) {
            return;
        }
        if (paymentMockEnabled) {
            throw new IllegalStateException(
                    "Refusing to start: payment.mock-enabled=true is not allowed when spring.profiles.active includes prod");
        }
        if (!idempotencyRequired) {
            throw new IllegalStateException(
                    "Refusing to start: security.idempotency.required must be true in production");
        }
        if (!sseRequireAuth) {
            throw new IllegalStateException(
                    "Refusing to start: security.sse.require-auth must be true in production");
        }
        if (!rateLimitDistributed) {
            throw new IllegalStateException(
                    "Refusing to start: security.rate-limit.distributed must be true in production");
        }
        if (isDefaultOrWeakOtp(adminActionOtp)) {
            throw new IllegalStateException(
                    "Refusing to start: security.admin-action-otp must be set to a strong non-default value in production");
        }
        if (isUnsafeCors()) {
            throw new IllegalStateException(
                    "Refusing to start: app.cors.allowed-origin-patterns must not be '*' in production");
        }
        if (isUnsafeSmsProvider()) {
            if (!(isProdVnProfile() && zaloEnabled)) {
                throw new IllegalStateException(
                        "Refusing to start: sms.provider must be configured to a real provider in production"
                                + (isProdVnProfile()
                                ? " (prefer sms.provider=vn_esms, or set app.auth.zalo-enabled=true when SMS is deferred)"
                                : ""));
            }
        }
        if (isProdVnProfile() && isAliyunSmsProvider()) {
            throw new IllegalStateException(
                    "Refusing to start: prod-vn must not use sms.provider=ali_yun; "
                            + "set SMS_PROVIDER=vn_esms with partner credentials, or another VN-capable provider");
        }
        if (isProdVnProfile() && isVnEsmsProvider()) {
            if (vnEsmsPartnerWired) {
                throw new IllegalStateException(
                        "Refusing to start: sms.vn-esms.partner-wired must stay false until HTTP client implemented");
            }
            if (!isVnEsmsConfigured()) {
                throw new IllegalStateException(
                        "Refusing to start: sms.provider=vn_esms requires api-key/secret-key");
            }
        }
        if (allowMockOtp) {
            throw new IllegalStateException(
                    "Refusing to start: app.auth.allow-mock-otp=true is not allowed in production");
        }
        if (isUnsafeIdentityHashSecret(identityHashSecret)) {
            throw new IllegalStateException(
                    "Refusing to start: security.compliance.identity.hash-secret (IDENTITY_HASH_SECRET) must be set to a non-placeholder value in production");
        }
        if (requiresVnpayConfig() && !isVnpayConfigured()) {
            throw new IllegalStateException(
                    "Refusing to start: vnpay.tmn-code and vnpay.hash-secret must be set when app.market.payment-provider=vnpay in production");
        }
        if (requiresVnpayConfig() && vnpaySandbox) {
            throw new IllegalStateException(
                    "Refusing to start: vnpay.sandbox=true is not allowed in production / prod-vn");
        }
        if (requiresVnpayConfig() && isVnpayPlaceholderUrl(vnpayIpnUrl)) {
            throw new IllegalStateException(
                    "Refusing to start: vnpay.ipn-url must be set to a public HTTPS endpoint in production");
        }
        if (requiresVnpayConfig() && !StringUtils.hasText(vnpayReturnUrl)) {
            throw new IllegalStateException(
                    "Refusing to start: vnpay.return-url must be set in production");
        }
        if (requiresWechatConfig() && isWxMchUnset()) {
            throw new IllegalStateException(
                    "Refusing to start: wx.pay.mch-id must be set when app.market.payment-provider=wechat in production");
        }
        if (logisticsPartnerWired) {
            throw new IllegalStateException(
                    "Refusing to start: app.logistics.partner-wired must stay false until carrier tracking HTTP is implemented");
        }
        validateMomoCheckout();
        validateZaloPayCheckout();
        validateMarketplacePayoutGateway();
        warnLocalIdentityOnProdVn();
        refuseUnreadyEkycVendor();
        log.info("Production safety checks passed (payment.mock-enabled=false, OTP configured, CORS restricted)");
    }

    private void warnLocalIdentityOnProdVn() {
        if (!isProdVnProfile()) {
            return;
        }
        String provider = identityProvider == null ? "local" : identityProvider.trim().toLowerCase(Locale.ROOT);
        boolean local = provider.isBlank() || "local".equals(provider);
        if (local && minorVerificationRequired && !trustLocalVerification) {
            throw new IllegalStateException(
                    "Refusing to start: verification-required=true with local identity that is not trusted "
                            + "(set trust-local-verification=true for checksum-only, "
                            + "or verification-required=false until a real eKYC vendor is wired)");
        }
        if (local) {
            log.error(
                    "prod-vn: app.identity.provider is local (checksum-only); "
                            + "fake CCCD can pass format checks — keep verification-required=false "
                            + "until a real eKYC vendor replaces the stub");
        }
    }

    private void refuseUnreadyEkycVendor() {
        String provider = identityProvider == null ? "local" : identityProvider.trim().toLowerCase(Locale.ROOT);
        if ("ekyc_vendor".equals(provider)) {
            throw new IllegalStateException(
                    "Refusing to start: app.identity.provider=ekyc_vendor is not wired yet; "
                            + "keep local (with verification-required=false) until vendor credentials/API exist");
        }
    }

    private void validateMomoCheckout() {
        if (!momoEnabled) {
            return;
        }
        if (momoPartnerWired) {
            throw new IllegalStateException(
                    "Refusing to start: momo.partner-wired must stay false until Partner create/IPN/HMAC/query/refund is implemented");
        }
        // enabled=true while Partner is unwired is always unsafe (stub deeplink or false live surface).
        throw new IllegalStateException(
                "Refusing to start: momo.enabled=true is not allowed until Partner API is wired "
                        + "(keep enabled=false; stub deeplink alone must not be offered in production)");
    }

    private void validateZaloPayCheckout() {
        if (zaloPayPartnerWired) {
            throw new IllegalStateException(
                    "Refusing to start: zalopay.partner-wired must stay false until Partner disbursement HTTP is implemented");
        }
        if (!zaloPayEnabled) {
            return;
        }
        throw new IllegalStateException(
                "Refusing to start: zalopay.enabled=true is not allowed until Partner API is wired "
                        + "(keep enabled=false; credentials alone must not advertise disbursement ready)");
    }

    private void validateMarketplacePayoutGateway() {
        String gateway = marketplacePayoutGateway == null ? "wallet" : marketplacePayoutGateway.trim().toLowerCase();
        if ("momo".equals(gateway) || "zalopay".equals(gateway)) {
            // Gateways report isReady()=false until Partner disbursement exists — refuse boot, not settle-time.
            throw new IllegalStateException(
                    "Refusing to start: app.marketplace.payout-gateway=" + gateway
                            + " but Partner disbursement is not implemented; keep payout-gateway=wallet");
        }
    }

    private boolean requiresVnpayConfig() {
        return "vnpay".equalsIgnoreCase(marketPaymentProvider) || isProdVnProfile();
    }

    private boolean requiresWechatConfig() {
        return "wechat".equalsIgnoreCase(marketPaymentProvider)
                || "wx".equalsIgnoreCase(marketPaymentProvider)
                || "we_chat".equalsIgnoreCase(marketPaymentProvider);
    }

    private boolean isWxMchUnset() {
        if (!StringUtils.hasText(wxPayMchId)) {
            return true;
        }
        String normalized = wxPayMchId.trim().toLowerCase(Locale.ROOT);
        return "xxxx".equals(normalized) || "change_me".equals(normalized) || normalized.contains("placeholder");
    }

    private boolean isVnpayConfigured() {
        return StringUtils.hasText(vnpayTmnCode) && StringUtils.hasText(vnpayHashSecret);
    }

    private boolean isVnpayPlaceholderUrl(String url) {
        if (!StringUtils.hasText(url)) {
            return true;
        }
        String normalized = url.trim().toLowerCase();
        return normalized.contains("api.example.com") || normalized.contains("example.com/front");
    }

    private boolean isProdVnProfile() {
        return Arrays.stream(environment.getActiveProfiles())
                .anyMatch(p -> "prod-vn".equalsIgnoreCase(p));
    }

    private boolean isProductionProfile() {
        return Arrays.stream(environment.getActiveProfiles())
                .anyMatch(p -> "prod".equalsIgnoreCase(p)
                        || "production".equalsIgnoreCase(p)
                        || "prod-vn".equalsIgnoreCase(p));
    }

    private boolean isUnsafeCors() {
        if (corsAllowedOriginPatterns == null || corsAllowedOriginPatterns.isBlank()) {
            return true;
        }
        var patterns = Arrays.stream(corsAllowedOriginPatterns.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        return patterns.isEmpty() || (patterns.size() == 1 && "*".equals(patterns.get(0)));
    }

    private boolean isUnsafeSmsProvider() {
        String provider = smsProvider == null ? "" : smsProvider.trim();
        return provider.isBlank() || "none".equalsIgnoreCase(provider);
    }

    private boolean isAliyunSmsProvider() {
        String provider = smsProvider == null ? "" : smsProvider.trim();
        return "ali_yun".equalsIgnoreCase(provider) || "aliyun".equalsIgnoreCase(provider);
    }

    private boolean isVnEsmsProvider() {
        String provider = smsProvider == null ? "" : smsProvider.trim();
        return "vn_esms".equalsIgnoreCase(provider);
    }

    private boolean isVnEsmsConfigured() {
        return StringUtils.hasText(vnEsmsApiKey) && StringUtils.hasText(vnEsmsSecretKey);
    }

    static boolean isUnsafeIdentityHashSecret(String secret) {
        String value = secret == null ? "" : secret.trim();
        if (value.isBlank()) {
            return true;
        }
        String upper = value.toUpperCase(Locale.ROOT);
        if (IDENTITY_HASH_PLACEHOLDERS.contains(value) || IDENTITY_HASH_PLACEHOLDERS.contains(upper)) {
            return true;
        }
        return upper.contains("CHANGE_ME") || upper.contains("PLACEHOLDER");
    }

    private static boolean isDefaultOrWeakOtp(String otp) {
        String value = otp == null ? "" : otp.trim();
        if (value.isBlank() || DEFAULT_OTP_PLACEHOLDERS.contains(value)) {
            return true;
        }
        if (value.length() < 8) {
            return true;
        }
        return value.chars().distinct().count() <= 2;
    }
}
