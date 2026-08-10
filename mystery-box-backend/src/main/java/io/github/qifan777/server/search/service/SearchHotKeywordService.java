package io.github.qifan777.server.search.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SearchHotKeywordService {
    private static final List<String> DEFAULT_KEYWORDS = List.of("一番赏", "手办", "新品", "限定");
    private static final Duration CACHE_TTL = Duration.ofMinutes(5);
    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {
    };

    private final JdbcTemplate jdbcTemplate;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public List<String> hotKeywords(int limit) {
        int size = Math.min(Math.max(limit, 1), 20);
        String cacheKey = "search:hot-keywords:" + size;
        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null && !cached.isBlank()) {
                return objectMapper.readValue(cached, STRING_LIST);
            }
        } catch (Exception ignored) {
            // fall through to DB
        }

        List<String> keywords = loadHotKeywords(size);
        try {
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(keywords), CACHE_TTL);
        } catch (Exception ignored) {
            // cache write is best-effort
        }
        return keywords;
    }

    private List<String> loadHotKeywords(int size) {
        try {
            List<String> fromTable = jdbcTemplate.query(
                    """
                            SELECT keyword FROM search_hot_keyword
                            WHERE enabled = 1
                            ORDER BY sort_order ASC, created_time ASC, id ASC
                            LIMIT ?
                            """,
                    (rs, rowNum) -> rs.getString("keyword"),
                    size
            );
            if (!fromTable.isEmpty()) {
                return fromTable;
            }
        } catch (Exception ignored) {
            // table may not exist in some test environments
        }
        try {
            List<String> fromAnalytics = jdbcTemplate.query(
                    """
                            SELECT CAST(JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.keyword')) AS CHAR) AS keyword,
                                   COUNT(1) AS score
                            FROM analytics_event
                            WHERE event_name = 'search_submit'
                              AND JSON_EXTRACT(payload_json, '$.keyword') IS NOT NULL
                              AND event_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                            GROUP BY keyword
                            HAVING keyword IS NOT NULL AND keyword <> ''
                            ORDER BY score DESC
                            LIMIT ?
                            """,
                    (rs, rowNum) -> rs.getString("keyword"),
                    size);
            if (!fromAnalytics.isEmpty()) {
                return fromAnalytics;
            }
        } catch (Exception ignored) {
            // analytics table or JSON functions may be unavailable in some environments
        }
        return DEFAULT_KEYWORDS.stream().limit(size).toList();
    }
}
