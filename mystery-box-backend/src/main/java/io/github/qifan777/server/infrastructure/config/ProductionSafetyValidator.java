package io.github.qifan777.server.infrastructure.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Arrays;
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

    @Value("${payment.mock-enabled:false}")
    private boolean paymentMockEnabled;

    @Value("${security.admin-action-otp:}")
    private String adminActionOtp;

    @Value("${app.cors.allowed-origin-patterns:*}")
    private String corsAllowedOriginPatterns;

    @Value("${sms.provider:none}")
    private String smsProvider;

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
        if (isDefaultOrWeakOtp(adminActionOtp)) {
            throw new IllegalStateException(
                    "Refusing to start: security.admin-action-otp must be set to a strong non-default value in production");
        }
        if (isUnsafeCors()) {
            throw new IllegalStateException(
                    "Refusing to start: app.cors.allowed-origin-patterns must not be '*' in production");
        }
        if (isUnsafeSmsProvider()) {
            throw new IllegalStateException(
                    "Refusing to start: sms.provider must be configured to a real provider in production");
        }
        if (allowMockOtp) {
            throw new IllegalStateException(
                    "Refusing to start: app.auth.allow-mock-otp=true is not allowed in production");
        }
        if (requiresVnpayConfig() && !isVnpayConfigured()) {
            throw new IllegalStateException(
                    "Refusing to start: vnpay.tmn-code and vnpay.hash-secret must be set when app.market.payment-provider=vnpay in production");
        }
        if (requiresVnpayConfig() && isVnpayPlaceholderUrl(vnpayIpnUrl)) {
            throw new IllegalStateException(
                    "Refusing to start: vnpay.ipn-url must be set to a public HTTPS endpoint in production");
        }
        if (requiresVnpayConfig() && !StringUtils.hasText(vnpayReturnUrl)) {
            throw new IllegalStateException(
                    "Refusing to start: vnpay.return-url must be set in production");
        }
        log.info("Production safety checks passed (payment.mock-enabled=false, OTP configured, CORS restricted)");
    }

    private boolean requiresVnpayConfig() {
        return "vnpay".equalsIgnoreCase(marketPaymentProvider) || isProdVnProfile();
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
