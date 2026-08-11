package io.github.qifan777.server.infrastructure.config;

import cn.dev33.satoken.stp.StpUtil;
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
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * Idempotency for mutating front/admin APIs: first 2xx response is cached and replayed on duplicate keys.
 * In-flight duplicates get 409 + {@code IDEMPOTENCY_IN_PROGRESS}.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 2)
public class IdempotencyKeyFilter extends OncePerRequestFilter {
    private static final String REDIS_PREFIX = "idempotency:";
    private static final String MARKER_IN_PROGRESS = "P";
    private static final String MARKER_SUCCESS_PREFIX = "S|";
    private static final int MAX_CACHED_BODY_BYTES = 256 * 1024;

    private final Map<String, CachedEntry> responseCache = new ConcurrentHashMap<>();

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    @Value("${security.idempotency.enabled:true}")
    private boolean enabled;

    /** Default 15 minutes — long enough to cover client retries after success. */
    @Value("${security.idempotency.ttl-ms:900000}")
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
                writeJson(response, HttpServletResponse.SC_BAD_REQUEST,
                        "{\"code\":400,\"msg\":\"缺少 x-idempotency-key\",\"errorCode\":\"IDEMPOTENCY_KEY_REQUIRED\"}");
                return;
            }
            filterChain.doFilter(request, response);
            return;
        }
        String dedupeKey = buildDedupeKey(request, idempotencyKey.trim());
        ClaimResult claim = tryClaim(dedupeKey);
        if (claim.isReplay() && claim.cached != null) {
            replay(response, claim.cached);
            return;
        }
        if (claim.kind == ClaimResult.Kind.IN_PROGRESS) {
            writeJson(response, HttpServletResponse.SC_CONFLICT,
                    "{\"code\":409,\"msg\":\"请求处理中，请稍后重试\",\"errorCode\":\"IDEMPOTENCY_IN_PROGRESS\"}");
            return;
        }

        ContentCachingResponseWrapper wrapped = new ContentCachingResponseWrapper(response);
        try {
            filterChain.doFilter(request, wrapped);
            int status = wrapped.getStatus();
            byte[] body = wrapped.getContentAsByteArray();
            String contentType = wrapped.getContentType();
            if (status >= 200 && status < 300) {
                storeSuccess(dedupeKey, status, contentType, body);
            } else {
                releaseClaim(dedupeKey);
            }
            wrapped.copyBodyToResponse();
        } catch (Exception ex) {
            releaseClaim(dedupeKey);
            throw ex;
        }
    }

    private String buildDedupeKey(HttpServletRequest request, String idempotencyKey) {
        String userPart = resolveUserPart();
        return request.getMethod() + ":" + request.getRequestURI() + userPart + ":" + idempotencyKey;
    }

    private String resolveUserPart() {
        try {
            if (StpUtil.isLogin()) {
                return ":u:" + StpUtil.getLoginIdAsString();
            }
        } catch (Exception ignored) {
            // Filter may run before Sa-Token context; key still unique per URI+idempotency key.
        }
        return "";
    }

    private ClaimResult tryClaim(String dedupeKey) {
        if (useRedis()) {
            return tryClaimRedis(dedupeKey);
        }
        return tryClaimLocal(dedupeKey);
    }

    private boolean useRedis() {
        return distributed && redisTemplate != null;
    }

    private ClaimResult tryClaimRedis(String dedupeKey) {
        String redisKey = REDIS_PREFIX + dedupeKey;
        Boolean ok = redisTemplate.opsForValue().setIfAbsent(redisKey, MARKER_IN_PROGRESS, ttlMs, TimeUnit.MILLISECONDS);
        if (ok != null && ok) {
            return ClaimResult.claimed();
        }
        String existing = redisTemplate.opsForValue().get(redisKey);
        CachedEntry cached = parseRedisValue(existing);
        if (cached != null && !cached.inProgress) {
            return ClaimResult.replay(cached);
        }
        return ClaimResult.inProgress();
    }

    private ClaimResult tryClaimLocal(String dedupeKey) {
        long now = System.currentTimeMillis();
        clearExpired(now);
        CachedEntry inProgress = CachedEntry.inProgress(now + ttlMs);
        CachedEntry existing = responseCache.putIfAbsent(dedupeKey, inProgress);
        if (existing == null) {
            return ClaimResult.claimed();
        }
        if (existing.expiresAtMillis < now) {
            if (responseCache.replace(dedupeKey, existing, inProgress)) {
                return ClaimResult.claimed();
            }
            existing = responseCache.get(dedupeKey);
            if (existing == null) {
                return ClaimResult.claimed();
            }
        }
        if (!existing.inProgress) {
            return ClaimResult.replay(existing);
        }
        return ClaimResult.inProgress();
    }

    private void storeSuccess(String dedupeKey, int status, String contentType, byte[] body) {
        byte[] storedBody = body == null ? new byte[0] : body;
        if (storedBody.length > MAX_CACHED_BODY_BYTES) {
            // Oversized: keep claim as in-progress marker briefly is wrong; release so retries can proceed,
            // but prefer storing a truncated marker — drop body cache and release to avoid false IN_PROGRESS.
            releaseClaim(dedupeKey);
            return;
        }
        String ct = contentType != null ? contentType : MediaType.APPLICATION_JSON_VALUE;
        CachedEntry entry = CachedEntry.success(status, ct, storedBody, System.currentTimeMillis() + ttlMs);
        if (useRedis()) {
            String redisKey = REDIS_PREFIX + dedupeKey;
            String encoded = encodeSuccess(status, ct, storedBody);
            redisTemplate.opsForValue().set(redisKey, encoded, ttlMs, TimeUnit.MILLISECONDS);
        } else {
            responseCache.put(dedupeKey, entry);
        }
    }

    private void releaseClaim(String dedupeKey) {
        if (useRedis()) {
            redisTemplate.delete(REDIS_PREFIX + dedupeKey);
        } else {
            responseCache.remove(dedupeKey);
        }
    }

    private void replay(HttpServletResponse response, CachedEntry cached) throws IOException {
        response.setStatus(cached.status);
        if (StringUtils.hasText(cached.contentType)) {
            response.setContentType(cached.contentType);
        }
        byte[] body = cached.body != null ? cached.body : new byte[0];
        response.setContentLength(body.length);
        response.getOutputStream().write(body);
        response.getOutputStream().flush();
    }

    private void writeJson(HttpServletResponse response, int status, String json) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(json);
    }

    private static String encodeSuccess(int status, String contentType, byte[] body) {
        String b64 = Base64.getEncoder().encodeToString(body == null ? new byte[0] : body);
        String ct = contentType == null ? "" : contentType.replace('|', ' ');
        return MARKER_SUCCESS_PREFIX + status + "|" + ct + "|" + b64;
    }

    private static CachedEntry parseRedisValue(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        if (MARKER_IN_PROGRESS.equals(value)) {
            return CachedEntry.inProgress(Long.MAX_VALUE);
        }
        if (!value.startsWith(MARKER_SUCCESS_PREFIX)) {
            return null;
        }
        String rest = value.substring(MARKER_SUCCESS_PREFIX.length());
        int first = rest.indexOf('|');
        int second = rest.indexOf('|', first + 1);
        if (first <= 0 || second <= first) {
            return null;
        }
        try {
            int status = Integer.parseInt(rest.substring(0, first));
            String contentType = rest.substring(first + 1, second);
            byte[] body = Base64.getDecoder().decode(rest.substring(second + 1));
            return CachedEntry.success(status, contentType, body, Long.MAX_VALUE);
        } catch (RuntimeException ex) {
            return null;
        }
    }

    private boolean mandatoryIdempotency(HttpServletRequest request) {
        String method = request.getMethod();
        if (!"POST".equalsIgnoreCase(method)
                && !"PUT".equalsIgnoreCase(method)
                && !"PATCH".equalsIgnoreCase(method)) {
            return false;
        }
        String uri = request.getRequestURI();
        if (isReadOnlyPost(uri)) {
            return false;
        }
        if (required) {
            return true;
        }
        return uri.contains("/mystery-box-order")
                || uri.contains("/prepay")
                || uri.contains("/mock-pay")
                || uri.contains("/refund")
                || isMarketplaceBuy(uri);
    }

    /** POST .../marketplace/listings/{id}/buy */
    private boolean isMarketplaceBuy(String uri) {
        return uri.contains("/marketplace/") && uri.endsWith("/buy");
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
        responseCache.entrySet().removeIf(entry -> entry.getValue().expiresAtMillis < now);
    }

    private static final class CachedEntry {
        final boolean inProgress;
        final int status;
        final String contentType;
        final byte[] body;
        final long expiresAtMillis;

        private CachedEntry(boolean inProgress, int status, String contentType, byte[] body, long expiresAtMillis) {
            this.inProgress = inProgress;
            this.status = status;
            this.contentType = contentType;
            this.body = body;
            this.expiresAtMillis = expiresAtMillis;
        }

        static CachedEntry inProgress(long expiresAtMillis) {
            return new CachedEntry(true, 0, null, null, expiresAtMillis);
        }

        static CachedEntry success(int status, String contentType, byte[] body, long expiresAtMillis) {
            return new CachedEntry(false, status, contentType, body, expiresAtMillis);
        }
    }

    private static final class ClaimResult {
        static final ClaimResult IN_PROGRESS = new ClaimResult(Kind.IN_PROGRESS, null);

        enum Kind { CLAIMED, REPLAY, IN_PROGRESS }

        final Kind kind;
        final CachedEntry cached;

        private ClaimResult(Kind kind, CachedEntry cached) {
            this.kind = kind;
            this.cached = cached;
        }

        static ClaimResult claimed() {
            return new ClaimResult(Kind.CLAIMED, null);
        }

        static ClaimResult replay(CachedEntry cached) {
            return new ClaimResult(Kind.REPLAY, cached);
        }

        static ClaimResult inProgress() {
            return IN_PROGRESS;
        }

        boolean isReplay() {
            return kind == Kind.REPLAY;
        }
    }
}
