package io.github.qifan777.server.user.auth;

import io.github.qifan777.server.sms.SmsProvider;
import io.qifan.infrastructure.common.exception.BusinessException;
import io.qifan.infrastructure.sms.SmsService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Optional;
import java.util.concurrent.TimeUnit;

/**
 * Front OTP send: stores code via starter {@link SmsService}, then attempts Partner delivery.
 */
@Service
@Slf4j
public class AuthSmsSendService {
    private static final String SEND_RATE_KEY = "auth:sms:send-rate:";

    private final SmsService smsService;
    private final AuthSmsOtpGuard authSmsOtpGuard;
    private final StringRedisTemplate redisTemplate;
    private final Optional<SmsProvider> smsProvider;

    @Value("${app.auth.allow-mock-otp:false}")
    private boolean allowMockOtp;

    @Value("${app.auth.sms-send-cooldown-seconds:60}")
    private int sendCooldownSeconds;

    public AuthSmsSendService(
            SmsService smsService,
            AuthSmsOtpGuard authSmsOtpGuard,
            StringRedisTemplate redisTemplate,
            @Autowired(required = false) SmsProvider smsProvider
    ) {
        this.smsService = smsService;
        this.authSmsOtpGuard = authSmsOtpGuard;
        this.redisTemplate = redisTemplate;
        this.smsProvider = Optional.ofNullable(smsProvider);
    }

    /**
     * @return true when OTP was stored (and optionally delivered). Never returns the code to clients.
     */
    public boolean send(String phone) {
        authSmsOtpGuard.assertPhoneFormat(phone);
        String normalized = phone.trim();
        assertCooldown(normalized);

        String code = smsService.sendSms(normalized);
        if (!StringUtils.hasText(code)) {
            throw new BusinessException("验证码发送失败，请稍后重试");
        }

        boolean delivered = tryDeliver(normalized, code);
        if (!delivered && !allowMockOtp) {
            // Code sits in Redis but user cannot receive it — fail closed with a clear signal.
            log.warn("Auth SMS stored but not delivered (provider not ready) phone={}", mask(normalized));
            throw new BusinessException("SMS_UNAVAILABLE");
        }
        if (!delivered) {
            log.info("Auth SMS stored for mock/dev path phone={}", mask(normalized));
        }
        markCooldown(normalized);
        return true;
    }

    private boolean tryDeliver(String phone, String code) {
        if (smsProvider.isEmpty()) {
            // No SPI bean: starter SmsService already stored OTP (and AliYunSmsService sends if active).
            return true;
        }
        SmsProvider provider = smsProvider.get();
        if ("ali_yun".equalsIgnoreCase(provider.provider())) {
            // OTP is in Redis via smsService.sendSms; Aliyun delivery is handled by starter SmsService impl.
            return true;
        }
        if (!provider.isReady()) {
            return false;
        }
        String content = "Ma OTP: " + code;
        try {
            return provider.send(phone, content);
        } catch (Exception ex) {
            log.warn("Auth SMS provider send failed phone={}", mask(phone), ex);
            return false;
        }
    }

    private void assertCooldown(String phone) {
        Boolean has = redisTemplate.hasKey(SEND_RATE_KEY + phone);
        if (Boolean.TRUE.equals(has)) {
            throw new BusinessException("发送过于频繁，请稍后再试");
        }
    }

    private void markCooldown(String phone) {
        int ttl = Math.max(30, sendCooldownSeconds);
        redisTemplate.opsForValue().set(SEND_RATE_KEY + phone, "1", ttl, TimeUnit.SECONDS);
    }

    private static String mask(String phone) {
        if (phone == null || phone.length() < 4) {
            return "****";
        }
        return "****" + phone.substring(phone.length() - 4);
    }
}
