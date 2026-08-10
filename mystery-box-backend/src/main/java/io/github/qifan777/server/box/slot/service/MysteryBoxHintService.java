package io.github.qifan777.server.box.slot.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.user.hint.UserHintCardService;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MysteryBoxHintService {
    private static final Duration SESSION_TTL = Duration.ofHours(2);
    private static final long CONFIG_CACHE_MS = 60_000L;
    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {
    };

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final MysteryBoxRepository mysteryBoxRepository;
    private final UserHintCardService userHintCardService;
    private final JdbcTemplate jdbcTemplate;

    private volatile Map<String, Integer> configCache = Map.of();
    private volatile long configCacheAt = 0L;

    @Value("${mystery-box.hint.max-per-session:3}")
    private int maxHintsPerSession;

    @Value("${mystery-box.hint.daily-limit-fallback:20}")
    private int dailyLimitFallback;

    public HintSessionView session(String mysteryBoxId, String userId) {
        if (!mysteryBoxRepository.existsById(mysteryBoxId)) {
            throw new BusinessException("盲盒不存在");
        }
        return new HintSessionView(loadExcluded(mysteryBoxId, userId));
    }

    @Transactional
    public HintResultView hint(String mysteryBoxId, String userId) {
        enforceDailyLimit(userId);
        userHintCardService.consume(userId, 1);
        List<String> excluded = loadExcluded(mysteryBoxId, userId);
        if (excluded.size() >= resolveMaxHintsPerSession()) {
            throw new BusinessException("本盒提示次数已达上限");
        }
        if (!mysteryBoxRepository.existsById(mysteryBoxId)) {
            throw new BusinessException("盲盒不存在");
        }
        Set<String> available = loadQualityTypes(mysteryBoxId);
        available.removeAll(excluded);
        if (available.isEmpty()) {
            throw new BusinessException("暂无可排除的品质类型");
        }
        List<String> pool = new ArrayList<>(available);
        String excludedQuality = pool.get(ThreadLocalRandom.current().nextInt(pool.size()));
        excluded.add(excludedQuality);
        saveExcluded(mysteryBoxId, userId, excluded);
        incrementDailyUsage(userId);
        return new HintResultView(
                excludedQuality,
                excluded,
                userHintCardService.balance(userId),
                resolveMaxHintsPerSession() - excluded.size()
        );
    }

    private Set<String> loadQualityTypes(String mysteryBoxId) {
        List<String> qualities = jdbcTemplate.query(
                """
                        SELECT DISTINCT p.quality_type
                        FROM mystery_box_product_rel rel
                        INNER JOIN product p ON p.id = rel.product_id
                        WHERE rel.mystery_box_id = ?
                          AND p.quality_type IS NOT NULL
                          AND p.quality_type <> ''
                        """,
                (rs, rowNum) -> rs.getString("quality_type"),
                mysteryBoxId
        );
        return new HashSet<>(qualities);
    }

    private List<String> loadExcluded(String mysteryBoxId, String userId) {
        String raw = redisTemplate.opsForValue().get(sessionKey(mysteryBoxId, userId));
        if (raw == null || raw.isBlank()) {
            return new ArrayList<>();
        }
        try {
            return new ArrayList<>(objectMapper.readValue(raw, STRING_LIST));
        } catch (Exception ex) {
            return new ArrayList<>();
        }
    }

    private void saveExcluded(String mysteryBoxId, String userId, List<String> excluded) {
        try {
            redisTemplate.opsForValue().set(
                    sessionKey(mysteryBoxId, userId),
                    objectMapper.writeValueAsString(excluded),
                    SESSION_TTL
            );
        } catch (Exception ex) {
            throw new BusinessException("提示会话保存失败");
        }
    }

    private static String sessionKey(String mysteryBoxId, String userId) {
        return "mystery-box:hint-session:" + mysteryBoxId + ":" + userId;
    }

    private void enforceDailyLimit(String userId) {
        int dailyLimit = resolveDailyLimit();
        if (dailyLimit <= 0) {
            return;
        }
        String key = dailyUsageKey(userId);
        String raw = redisTemplate.opsForValue().get(key);
        int used = raw == null || raw.isBlank() ? 0 : Integer.parseInt(raw);
        if (used >= dailyLimit) {
            throw new BusinessException("今日提示次数已达上限");
        }
    }

    private void incrementDailyUsage(String userId) {
        int dailyLimit = resolveDailyLimit();
        if (dailyLimit <= 0) {
            return;
        }
        String key = dailyUsageKey(userId);
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1L) {
            redisTemplate.expire(key, Duration.ofDays(2));
        }
    }

    private int resolveDailyLimit() {
        return resolveConfigInt("hint_daily_limit", dailyLimitFallback);
    }

    private int resolveMaxHintsPerSession() {
        return resolveConfigInt("hint_max_per_session", maxHintsPerSession);
    }

    private int resolveConfigInt(String configKey, int fallback) {
        refreshConfigCacheIfNeeded();
        return configCache.getOrDefault(configKey, fallback);
    }

    private void refreshConfigCacheIfNeeded() {
        long now = System.currentTimeMillis();
        if (now - configCacheAt < CONFIG_CACHE_MS) {
            return;
        }
        synchronized (this) {
            if (now - configCacheAt < CONFIG_CACHE_MS) {
                return;
            }
            try {
                List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                        "SELECT config_key, config_value FROM hint_policy_config"
                );
                Map<String, Integer> next = new HashMap<>();
                for (Map<String, Object> row : rows) {
                    Object key = row.get("config_key");
                    Object value = row.get("config_value");
                    if (key == null || value == null) {
                        continue;
                    }
                    try {
                        next.put(String.valueOf(key), Integer.parseInt(String.valueOf(value)));
                    } catch (NumberFormatException ignored) {
                        // skip malformed config rows
                    }
                }
                configCache = Map.copyOf(next);
                configCacheAt = System.currentTimeMillis();
            } catch (Exception ex) {
                configCacheAt = System.currentTimeMillis();
            }
        }
    }

    private static String dailyUsageKey(String userId) {
        return "mystery-box:hint-daily:" + userId + ":" + LocalDate.now();
    }

    public record HintSessionView(List<String> excludedQualityTypes) {
        public HintSessionView {
            excludedQualityTypes = excludedQualityTypes == null
                    ? Collections.emptyList()
                    : List.copyOf(excludedQualityTypes);
        }
    }

    public record HintResultView(
            String excludedQualityType,
            List<String> excludedQualityTypes,
            int hintCardsRemaining,
            int hintsRemaining
    ) {
        public HintResultView {
            excludedQualityTypes = excludedQualityTypes == null
                    ? Collections.emptyList()
                    : List.copyOf(excludedQualityTypes);
        }
    }
}
