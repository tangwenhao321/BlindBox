package io.github.qifan777.server.infrastructure.security;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.infrastructure.util.ClientIpResolver;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Shared admin high-risk OTP gate. Failure lockout is Redis-backed for multi-instance safety.
 * After a successful OTP/TOTP check, a short-lived grant is issued so follow-up high-risk actions
 * in the same window can send {@code x-admin-action-otp: GRANT} without re-entering the secret.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AdminActionOtpVerifier {
    public static final String GRANT_TOKEN = "GRANT";

    private static final int OTP_MAX_FAILURE = 5;
    private static final long OTP_LOCK_MS = 10 * 60 * 1000L;
    private static final long GRANT_TTL_MS = 5 * 60 * 1000L;
    private static final String FAIL_KEY = "admin:otp:fail:";
    private static final String LOCK_KEY = "admin:otp:lock:";
    private static final String GRANT_KEY = "admin:otp:grant:";

    private final ClientIpResolver clientIpResolver;
    private final StringRedisTemplate redisTemplate;

    @Value("${security.admin-action-otp:}")
    private String adminActionOtp;

    /** Optional Base32 TOTP secret; when set, either static OTP or current TOTP code is accepted. */
    @Value("${security.admin-action-totp-secret:}")
    private String adminActionTotpSecret;

    public void assertValid(String otp) {
        String traceId = resolveTraceId();
        ensureOtpConfigured(traceId);
        String actorId = StpUtil.isLogin() ? StpUtil.getLoginIdAsString() : "anonymous";
        String clientIp = resolveClientIp();
        String requestUri = getRequestUri();
        assertNotLocked(actorId, clientIp, traceId, requestUri);

        if (hasGrant(actorId) && isGrantPresentation(otp)) {
            log.info("security_audit otp_grant_used traceId={} actorId={} ip={} uri={}",
                    traceId, actorId, clientIp, requestUri);
            return;
        }

        if (otp == null || otp.isBlank()) {
            recordOtpFailure(actorId);
            recordOtpFailure("ip:" + clientIp);
            log.warn("security_audit otp_failed_missing_header traceId={} actorId={} ip={} uri={}",
                    traceId, actorId, clientIp, requestUri);
            throw new BusinessException(ResultCode.ParamSetIllegal, "高危操作口令校验失败");
        }
        if (isGrantPresentation(otp)) {
            throw new BusinessException(ResultCode.ParamSetIllegal, "高危操作授权已过期，请重新输入口令");
        }

        byte[] configured = adminActionOtp.trim().getBytes(StandardCharsets.UTF_8);
        byte[] provided = otp.trim().getBytes(StandardCharsets.UTF_8);
        boolean staticOk = MessageDigest.isEqual(configured, provided);
        boolean totpOk = TotpCodes.matches(adminActionTotpSecret, otp);
        if (!staticOk && !totpOk) {
            recordOtpFailure(actorId);
            recordOtpFailure("ip:" + clientIp);
            log.warn("security_audit otp_failed_mismatch traceId={} actorId={} ip={} uri={}",
                    traceId, actorId, clientIp, requestUri);
            throw new BusinessException(ResultCode.ParamSetIllegal, "高危操作口令校验失败");
        }
        clearFailures(actorId);
        clearFailures("ip:" + clientIp);
        issueGrant(actorId);
        log.info("security_audit otp_passed traceId={} actorId={} ip={} uri={}",
                traceId, actorId, clientIp, requestUri);
    }

    /** Validate OTP/TOTP and issue a 5-minute grant for subsequent high-risk APIs. */
    public Map<String, Object> issueActionGrant(String otp) {
        assertValid(otp);
        String actorId = StpUtil.getLoginIdAsString();
        long expiresAt = System.currentTimeMillis() + GRANT_TTL_MS;
        return Map.of(
                "ok", true,
                "grantToken", GRANT_TOKEN,
                "expiresInSec", GRANT_TTL_MS / 1000,
                "expiresAtMs", expiresAt,
                "actorId", actorId
        );
    }

    private void ensureOtpConfigured(String traceId) {
        if (adminActionOtp == null || adminActionOtp.isBlank()) {
            log.error("security_audit otp_config_missing traceId={} uri={}", traceId, getRequestUri());
            throw new BusinessException(ResultCode.ParamSetIllegal, "服务端未配置 admin-action-otp");
        }
        if (isWeakOtp(adminActionOtp)) {
            log.error("security_audit otp_config_weak traceId={} uri={}", traceId, getRequestUri());
            throw new BusinessException(ResultCode.ParamSetIllegal, "服务端 admin-action-otp 配置过弱，请使用高强度口令");
        }
    }

    private static boolean isGrantPresentation(String otp) {
        return otp != null && GRANT_TOKEN.equalsIgnoreCase(otp.trim());
    }

    private boolean hasGrant(String actorId) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(GRANT_KEY + actorId));
        } catch (Exception ex) {
            log.warn("admin otp grant check failed actorId={}", actorId, ex);
            return false;
        }
    }

    private void issueGrant(String actorId) {
        try {
            redisTemplate.opsForValue().set(GRANT_KEY + actorId, "1", GRANT_TTL_MS, TimeUnit.MILLISECONDS);
        } catch (Exception ex) {
            log.warn("admin otp grant issue failed actorId={}", actorId, ex);
        }
    }

    private void assertNotLocked(String actorId, String clientIp, String traceId, String requestUri) {
        if (isLocked(actorId)) {
            log.warn("security_audit otp_locked_actor traceId={} actorId={} ip={} uri={}",
                    traceId, actorId, clientIp, requestUri);
            throw new BusinessException(ResultCode.ParamSetIllegal, "口令错误次数过多，请稍后重试");
        }
        if (isLocked("ip:" + clientIp)) {
            log.warn("security_audit otp_locked_ip traceId={} actorId={} ip={} uri={}",
                    traceId, actorId, clientIp, requestUri);
            throw new BusinessException(ResultCode.ParamSetIllegal, "该来源口令错误次数过多，请稍后重试");
        }
    }

    private boolean isLocked(String key) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(LOCK_KEY + key));
        } catch (Exception ex) {
            log.warn("admin otp lock check failed key={} (fail-closed)", key, ex);
            return true;
        }
    }

    private void recordOtpFailure(String key) {
        try {
            String failKey = FAIL_KEY + key;
            Long count = redisTemplate.opsForValue().increment(failKey);
            if (count != null && count == 1L) {
                redisTemplate.expire(failKey, OTP_LOCK_MS, TimeUnit.MILLISECONDS);
            }
            if (count != null && count >= OTP_MAX_FAILURE) {
                redisTemplate.opsForValue().set(LOCK_KEY + key, "1", OTP_LOCK_MS, TimeUnit.MILLISECONDS);
            }
        } catch (Exception ex) {
            log.warn("admin otp failure record failed key={}", key, ex);
        }
    }

    private void clearFailures(String key) {
        try {
            redisTemplate.delete(FAIL_KEY + key);
            redisTemplate.delete(LOCK_KEY + key);
        } catch (Exception ex) {
            log.warn("admin otp clear failed key={}", key, ex);
        }
    }

    private String resolveClientIp() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return "unknown";
        }
        return clientIpResolver.resolve(attrs.getRequest());
    }

    private static boolean isWeakOtp(String otp) {
        String value = otp == null ? "" : otp.trim();
        if (value.length() < 8) {
            return true;
        }
        return value.chars().distinct().count() <= 2;
    }

    private String getRequestUri() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return "unknown";
        }
        return attrs.getRequest().getRequestURI();
    }

    private String resolveTraceId() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return UUID.randomUUID().toString();
        }
        HttpServletRequest request = attrs.getRequest();
        String traceId = request.getHeader("X-Request-Id");
        if (traceId == null || traceId.isBlank()) {
            traceId = request.getHeader("X-Trace-Id");
        }
        if (traceId == null || traceId.isBlank()) {
            Object existing = request.getAttribute("traceId");
            traceId = existing instanceof String ? (String) existing : "";
        }
        if (traceId == null || traceId.isBlank()) {
            traceId = UUID.randomUUID().toString();
            request.setAttribute("traceId", traceId);
        }
        return traceId;
    }
}
