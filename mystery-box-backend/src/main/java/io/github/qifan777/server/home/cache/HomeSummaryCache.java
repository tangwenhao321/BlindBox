package io.github.qifan777.server.home.cache;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;
import io.github.qifan777.server.home.model.HomeSummaryView;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class HomeSummaryCache {
    public static final String CACHE_KEY = "cache:home:summary";

    private final JsonMapper objectMapper;
    private final StringRedisTemplate redisTemplate;

    @Value("${app.cache.home-summary-ttl-seconds:60}")
    private long ttlSeconds;

    public Optional<HomeSummaryView> get() {
        try {
            String json = redisTemplate.opsForValue().get(CACHE_KEY);
            if (json == null || json.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.readValue(json, HomeSummaryView.class));
        } catch (Exception ex) {
            log.warn("home summary cache read failed: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    public void put(HomeSummaryView view) {
        try {
            String json = objectMapper.writeValueAsString(view);
            redisTemplate.opsForValue().set(CACHE_KEY, json, Duration.ofSeconds(Math.max(5, ttlSeconds)));
        } catch (JacksonException ex) {
            log.warn("home summary cache write failed: {}", ex.getMessage());
        }
    }

    public void evict() {
        redisTemplate.delete(CACHE_KEY);
    }
}
