package io.github.qifan777.server.recommendation.service;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Personalized / popular box recommendations with a short per-user TTL cache.
 * <p>
 * Prefers Redis JSON cache (TTL 60s) when {@link StringRedisTemplate} is available;
 * falls back to an in-memory {@link ConcurrentHashMap} when Redis is absent or down.
 * <p>
 * A/B variants: {@code PERSONALIZED} vs {@code POPULAR}. Clients should track
 * {@code RECOMMEND_IMPRESSION} (and clicks) with the returned {@code variant} id.
 */
@Service
@Slf4j
public class RecommendationService {
    private static final long CACHE_TTL_MS = 60_000L;
    private static final Duration CACHE_TTL = Duration.ofSeconds(60);
    private static final String CACHE_KEY_PREFIX = "cache:recommend:";

    private final JdbcTemplate jdbcTemplate;
    private final JsonMapper objectMapper;
    private final ConcurrentHashMap<String, CachedRecommendation> memoryCache = new ConcurrentHashMap<>();

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    public RecommendationService(JdbcTemplate jdbcTemplate, JsonMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public record RecommendationResult(List<String> boxIds, String variant) {
    }

    private record CachedRecommendation(List<String> boxIds, String variant, long cachedAt) {
    }

    public List<String> recommendBoxIds(String userId, int limit) {
        return recommend(userId, limit).boxIds();
    }

    public List<String> recommendBoxIds(String userId, int limit, String variant) {
        return recommend(userId, limit, variant).boxIds();
    }

    public RecommendationResult recommend(String userId, int limit) {
        return recommend(userId, limit, variantForUser(userId));
    }

    public RecommendationResult recommend(String userId, int limit, String variant) {
        int size = Math.max(1, limit);
        String useVariant = (variant == null || variant.isBlank()) ? variantForUser(userId) : variant;
        String cacheKey = Objects.toString(userId, "") + "|" + size + "|" + useVariant.toUpperCase();
        RecommendationResult fromCache = getCached(cacheKey);
        if (fromCache != null) {
            return fromCache;
        }
        List<String> boxIds = loadRecommendations(userId, size, useVariant);
        RecommendationResult result = new RecommendationResult(List.copyOf(boxIds), useVariant);
        putCached(cacheKey, result);
        return result;
    }

    private RecommendationResult getCached(String cacheKey) {
        if (redisTemplate != null) {
            try {
                String json = redisTemplate.opsForValue().get(CACHE_KEY_PREFIX + cacheKey);
                if (json != null && !json.isBlank()) {
                    RecommendationResult payload = objectMapper.readValue(json, RecommendationResult.class);
                    if (payload != null && payload.boxIds() != null && payload.variant() != null) {
                        return new RecommendationResult(List.copyOf(payload.boxIds()), payload.variant());
                    }
                }
            } catch (Exception ex) {
                log.debug("recommendation redis cache read failed, using memory: {}", ex.getMessage());
            }
        }
        long now = System.currentTimeMillis();
        CachedRecommendation cached = memoryCache.get(cacheKey);
        if (cached != null && now - cached.cachedAt() < CACHE_TTL_MS) {
            return new RecommendationResult(cached.boxIds(), cached.variant());
        }
        return null;
    }

    private void putCached(String cacheKey, RecommendationResult result) {
        long now = System.currentTimeMillis();
        memoryCache.put(cacheKey, new CachedRecommendation(result.boxIds(), result.variant(), now));
        if (redisTemplate == null) {
            return;
        }
        try {
            String json = objectMapper.writeValueAsString(result);
            redisTemplate.opsForValue().set(CACHE_KEY_PREFIX + cacheKey, json, CACHE_TTL);
        } catch (Exception ex) {
            log.debug("recommendation redis cache write failed: {}", ex.getMessage());
        }
    }

    private List<String> loadRecommendations(String userId, int size, String variant) {
        List<String> byBehavior = List.of();
        try {
            if ("POPULAR".equalsIgnoreCase(variant)) {
                byBehavior = jdbcTemplate.query(
                        "SELECT CAST(JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.boxId')) AS CHAR) AS box_id, COUNT(1) AS score " +
                                "FROM analytics_event " +
                                "WHERE event_name IN ('home_box_click', 'box_create_order_click') " +
                                "AND JSON_EXTRACT(payload_json, '$.boxId') IS NOT NULL " +
                                "GROUP BY box_id ORDER BY score DESC LIMIT ?",
                        (rs, rowNum) -> rs.getString("box_id"),
                        size
                );
            } else {
                byBehavior = jdbcTemplate.query(
                        "SELECT CAST(JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.boxId')) AS CHAR) AS box_id, COUNT(1) AS score " +
                                "FROM analytics_event " +
                                "WHERE actor_id = ? AND event_name IN ('home_box_click', 'box_create_order_click') " +
                                "AND JSON_EXTRACT(payload_json, '$.boxId') IS NOT NULL " +
                                "GROUP BY box_id ORDER BY score DESC LIMIT ?",
                        (rs, rowNum) -> rs.getString("box_id"),
                        userId == null ? "" : userId,
                        size
                );
            }
        } catch (Exception ex) {
            log.warn("recommendation behavior query failed, falling back to hot/newest boxes: {}", ex.getMessage());
            return fallbackHotOrNewest(size);
        }
        if (!byBehavior.isEmpty()) {
            return byBehavior;
        }
        return fallbackHotOrNewest(size);
    }

    /** Prefer weekly-hot boxes; if that fails or is empty, newest by edited_time. */
    private List<String> fallbackHotOrNewest(int size) {
        try {
            List<String> hot = jdbcTemplate.query(
                    """
                            SELECT mb.id
                            FROM mystery_box mb
                            LEFT JOIN (
                                SELECT mystery_box_id, COUNT(1) AS cnt
                                FROM mystery_box_draw_log
                                WHERE created_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                                GROUP BY mystery_box_id
                            ) s ON s.mystery_box_id = mb.id
                            ORDER BY s.cnt DESC, mb.pool_remaining DESC, mb.edited_time DESC
                            LIMIT ?
                            """,
                    (rs, rowNum) -> rs.getString("id"),
                    size
            );
            if (!hot.isEmpty()) {
                return hot;
            }
        } catch (Exception ex) {
            log.warn("recommendation hot-box fallback failed, using newest: {}", ex.getMessage());
        }
        try {
            return jdbcTemplate.query(
                    "SELECT id FROM mystery_box ORDER BY edited_time DESC LIMIT ?",
                    (rs, rowNum) -> rs.getString("id"),
                    size
            );
        } catch (Exception ex) {
            log.error("recommendation newest-box fallback failed: {}", ex.getMessage());
            return List.of();
        }
    }

    public Map<String, Object> debugFeatures(String userId) {
        String variant = variantForUser(userId);
        Integer clicks = 0;
        Integer createOrders = 0;
        try {
            clicks = jdbcTemplate.queryForObject(
                    "SELECT COUNT(1) FROM analytics_event WHERE actor_id = ? AND event_name = 'home_box_click'",
                    Integer.class,
                    userId == null ? "" : userId
            );
            createOrders = jdbcTemplate.queryForObject(
                    "SELECT COUNT(1) FROM analytics_event WHERE actor_id = ? AND event_name = 'box_create_order_click'",
                    Integer.class,
                    userId == null ? "" : userId
            );
        } catch (Exception ex) {
            log.warn("recommendation debugFeatures query failed: {}", ex.getMessage());
        }
        return Map.of(
                "userId", userId == null ? "" : userId,
                "variant", variant,
                "clicks", clicks == null ? 0 : clicks,
                "createOrders", createOrders == null ? 0 : createOrders
        );
    }

    public String variantForUser(String userId) {
        int hash = Math.abs(Objects.toString(userId, "").hashCode());
        return (hash % 100) < 50 ? "PERSONALIZED" : "POPULAR";
    }
}
