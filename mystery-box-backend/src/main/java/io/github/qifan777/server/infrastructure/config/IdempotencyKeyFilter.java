package io.github.qifan777.server.infrastructure.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 2)
public class IdempotencyKeyFilter extends OncePerRequestFilter {
    private final Map<String, Long> keyWindow = new ConcurrentHashMap<>();

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    @Value("${security.idempotency.enabled:true}")
    private boolean enabled;

    @Value("${security.idempotency.ttl-ms:300000}")
    private long ttlMs;

    @Value("${security.idempotency.distributed:true}")
    private boolean distributed;

    @Value("${security.idempotency.required:false}")
    private boolean required;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!enabled || !requiresIdempotency(request)) {
            filterChain.doFilter(request, response);
            return;
        }
        String idempotencyKey = request.getHeader("x-idempotency-key");
        if (!StringUtils.hasText(idempotencyKey)) {
            if (mandatoryIdempotency(request)) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.getWriter().write("{\"code\":400,\"msg\":\"缺少 x-idempotency-key\"}");
                return;
            }
            filterChain.doFilter(request, response);
            return;
        }
        String dedupeKey = request.getMethod() + ":" + request.getRequestURI() + ":" + idempotencyKey.trim();
        if (isDuplicate(dedupeKey)) {
            response.setStatus(HttpServletResponse.SC_CONFLICT);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"code\":409,\"msg\":\"重复请求已拦截，请勿重复提交\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean isDuplicate(String dedupeKey) {
        if (distributed && redisTemplate != null) {
            Boolean ok = redisTemplate.opsForValue().setIfAbsent("idempotency:" + dedupeKey, "1", ttlMs, TimeUnit.MILLISECONDS);
            return ok != null && !ok;
        }
        long now = System.currentTimeMillis();
        clearExpired(now);
        Long firstSeen = keyWindow.putIfAbsent(dedupeKey, now);
        return firstSeen != null && now - firstSeen < ttlMs;
    }

    private boolean mandatoryIdempotency(HttpServletRequest request) {
        if (required) {
            return true;
        }
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return false;
        }
        String uri = request.getRequestURI();
        if (isReadOnlyPost(uri)) {
            return false;
        }
        return uri.contains("/mystery-box-order")
                || uri.contains("/prepay")
                || uri.contains("/mock-pay")
                || uri.contains("/refund");
    }

    /** 查询/试算/回调等 POST 只读接口不要求幂等键 */
    private boolean isReadOnlyPost(String uri) {
        return uri.endsWith("/query")
                || uri.endsWith("/calculate")
                || uri.endsWith("/search")
                || uri.contains("/notify/");
    }

    private boolean requiresIdempotency(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (!(uri.startsWith("/front/") || uri.startsWith("/admin/"))) {
            return false;
        }
        String method = request.getMethod();
        return "POST".equalsIgnoreCase(method) || "PUT".equalsIgnoreCase(method) || "PATCH".equalsIgnoreCase(method);
    }

    private void clearExpired(long now) {
        keyWindow.entrySet().removeIf(entry -> now - entry.getValue() > ttlMs);
    }
}
