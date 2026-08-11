package io.github.qifan777.server.infrastructure.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Resolves client IP. Forwarded headers are trusted only when
 * {@code security.rate-limit.trusted-proxy=true} (same gate as {@code ApiRateLimitFilter}).
 */
@Component
public class ClientIpResolver {

    @Value("${security.rate-limit.trusted-proxy:false}")
    private boolean trustedProxy;

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
}
