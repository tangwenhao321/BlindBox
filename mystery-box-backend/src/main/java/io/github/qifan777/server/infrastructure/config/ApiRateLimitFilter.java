package io.github.qifan777.server.infrastructure.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class ApiRateLimitFilter extends OncePerRequestFilter {
    private final Map<String, Counter> counters = new ConcurrentHashMap<>();
    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;
    @Value("${security.rate-limit.enabled:true}")
    private boolean enabled;
    @Value("${security.rate-limit.per-minute:120}")
    private int perMinute;
    @Value("${security.rate-limit.analytics-per-minute:60}")
    private int analyticsPerMinute;
    @Value("${security.rate-limit.distributed:false}")
    private boolean distributed;

    @Value("${security.rate-limit.trusted-proxy:false}")
    private boolean trustedProxy;

    @Value("${security.rate-limit.login-per-minute:20}")
    private int loginPerMinute;

    @Value("${security.rate-limit.order-create-per-minute:30}")
    private int orderCreatePerMinute;

    @Value("${security.rate-limit.prepay-per-minute:20}")
    private int prepayPerMinute;

    @Value("${security.rate-limit.draw-queue-per-minute:40}")
    private int drawQueuePerMinute;

    @Value("${security.rate-limit.spectator-get-per-minute:60}")
    private int spectatorGetPerMinute;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!enabled || !shouldLimit(request)) {
            filterChain.doFilter(request, response);
            return;
        }
        long nowWindow = System.currentTimeMillis() / 60000L;
        String clientKey = clientIp(request);
        String token = request.getHeader("token");
        if (token != null && !token.isBlank()) {
            clientKey = clientKey + ":u:" + token.substring(0, Math.min(8, token.length()));
        }
        String uri = request.getRequestURI();
        if (uri != null && uri.contains("/front/reveal/spectator/")) {
            String spectatorToken = uri.substring(uri.lastIndexOf('/') + 1);
            if (!spectatorToken.isBlank()) {
                clientKey = clientKey + ":spectator:" + spectatorToken.substring(0, Math.min(12, spectatorToken.length()));
            }
        }
        String key = nowWindow + ":" + request.getMethod() + ":" + clientKey;
        int current;
        if (distributed && redisTemplate != null) {
            String redisKey = "rate-limit:" + key;
            Long value = redisTemplate.opsForValue().increment(redisKey);
            if (value != null && value == 1L) {
                redisTemplate.expire(redisKey, 70, TimeUnit.SECONDS);
            }
            current = value == null ? 1 : value.intValue();
        } else {
            counters.entrySet().removeIf(entry -> nowWindow - entry.getValue().windowMinute > 1);
            Counter counter = counters.computeIfAbsent(key, k -> new Counter(nowWindow));
            if (counter.windowMinute != nowWindow) {
                counter = new Counter(nowWindow);
                counters.put(key, counter);
            }
            current = counter.count.incrementAndGet();
        }
        int limit = perMinuteFor(request.getRequestURI());
        if (current > limit) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"code\":\"429\",\"message\":\"请求过于频繁，请稍后再试\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private int perMinuteFor(String uri) {
        if (uri == null) {
            return perMinute;
        }
        if (uri.contains("/analytics/events")) {
            return Math.max(10, analyticsPerMinute);
        }
        if (uri.contains("/login") || uri.contains("/register")) {
            return loginPerMinute;
        }
        if (uri.contains("/mystery-box-order") && !uri.contains("/prepay") && !uri.contains("/mock-pay")) {
            return orderCreatePerMinute;
        }
        if (uri.contains("/prepay") || uri.contains("/mock-pay")) {
            return prepayPerMinute;
        }
        if (uri.contains("/draw-queue")) {
            return drawQueuePerMinute;
        }
        if (uri.contains("/front/reveal/spectator/")) {
            return Math.max(1, spectatorGetPerMinute);
        }
        if (uri.contains("/slots/") || uri.contains("/hint")) {
            return drawQueuePerMinute;
        }
        return perMinute;
    }

    private boolean shouldLimit(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String method = request.getMethod();
        if (!(uri.startsWith("/front/") || uri.startsWith("/admin/"))) {
            return false;
        }
        if (uri.contains("/draw-queue") || uri.contains("/buyout-lock") || uri.contains("/oss/upload")) {
            return true;
        }
        if (uri.contains("/pool-stream") || uri.contains("/draw-feed/stream")) {
            return true;
        }
        if (uri.contains("/slots/") || uri.endsWith("/hint")) {
            return true;
        }
        if (uri.contains("/front/reveal/spectator/") && "GET".equalsIgnoreCase(method)) {
            return true;
        }
        return "POST".equalsIgnoreCase(method) || "PUT".equalsIgnoreCase(method) || "DELETE".equalsIgnoreCase(method);
    }

    private String clientIp(HttpServletRequest request) {
        if (trustedProxy) {
            String headerIp = request.getHeader("X-Forwarded-For");
            if (headerIp != null && !headerIp.isBlank()) {
                return headerIp.split(",")[0].trim();
            }
            String realIp = request.getHeader("X-Real-IP");
            if (realIp != null && !realIp.isBlank()) {
                return realIp.trim();
            }
        }
        return request.getRemoteAddr();
    }

    private static class Counter {
        private final long windowMinute;
        private final AtomicInteger count = new AtomicInteger(0);

        private Counter(long windowMinute) {
            this.windowMinute = windowMinute;
        }
    }
}
