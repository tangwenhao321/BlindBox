package io.github.qifan777.server.infrastructure.util;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Resolves client IP. Forwarded headers are trusted only when
 * {@code security.rate-limit.trusted-proxy=true} (same gate as {@code ApiRateLimitFilter}).
 */
@Component
@Slf4j
public class ClientIpResolver {

    @Value("${security.rate-limit.trusted-proxy:false}")
    private boolean trustedProxy;

    /** Used when no HTTP request is bound (jobs / async refund threads). */
    @Value("${app.vnpay.refund-client-ip:0.0.0.0}")
    private String refundClientIpDefault;

    public String resolve(HttpServletRequest request) {
        if (request == null) {
            return "127.0.0.1";
        }
        if (trustedProxy) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (StringUtils.hasText(forwarded)) {
                String first = forwarded.split(",")[0].trim();
                if (StringUtils.hasText(first)) {
                    return first;
                }
            }
            String realIp = request.getHeader("X-Real-IP");
            if (StringUtils.hasText(realIp)) {
                return realIp.trim();
            }
        }
        String remote = request.getRemoteAddr();
        return StringUtils.hasText(remote) ? remote.trim() : "127.0.0.1";
    }

    /**
     * Prefer the current request IP; else {@code app.vnpay.refund-client-ip}; else 127.0.0.1 + WARN.
     */
    public String resolveForRefund() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            HttpServletRequest request = attrs.getRequest();
            if (request != null) {
                if (trustedProxy) {
                    String forwarded = request.getHeader("X-Forwarded-For");
                    if (StringUtils.hasText(forwarded)) {
                        String first = forwarded.split(",")[0].trim();
                        if (StringUtils.hasText(first)) {
                            return first;
                        }
                    }
                    String realIp = request.getHeader("X-Real-IP");
                    if (StringUtils.hasText(realIp)) {
                        return realIp.trim();
                    }
                }
                String remote = request.getRemoteAddr();
                if (StringUtils.hasText(remote)) {
                    return remote.trim();
                }
            }
        }
        if (StringUtils.hasText(refundClientIpDefault)) {
            return refundClientIpDefault.trim();
        }
        log.warn("VNPay refund client IP unresolved; falling back to 127.0.0.1");
        return "127.0.0.1";
    }
}
