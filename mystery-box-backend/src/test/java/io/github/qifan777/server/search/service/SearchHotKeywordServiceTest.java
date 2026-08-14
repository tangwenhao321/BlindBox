package io.github.qifan777.server.search.service;

import java.time.Duration;

import tools.jackson.databind.json.JsonMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SearchHotKeywordServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;

    private SearchHotKeywordService service;

    @BeforeEach
    void setUp() {
        service = new SearchHotKeywordService(jdbcTemplate, redisTemplate, JsonMapper.shared());
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    void hotKeywords_prefersConfiguredTable() {
        when(valueOperations.get("search:hot-keywords:5")).thenReturn(null);
        when(jdbcTemplate.query(contains("search_hot_keyword"), any(RowMapper.class), eq(5)))
                .thenReturn(List.of("运营词", "限定"));

        List<String> keywords = service.hotKeywords(5);

        assertEquals(List.of("运营词", "限定"), keywords);
        verify(valueOperations).set(eq("search:hot-keywords:5"), any(String.class), any(Duration.class));
    }

    @Test
    void hotKeywords_returnsCachedValueWhenPresent() {
        when(valueOperations.get("search:hot-keywords:5")).thenReturn("[\"缓存词\"]");

        List<String> keywords = service.hotKeywords(5);

        assertEquals(List.of("缓存词"), keywords);
        verify(jdbcTemplate, never()).query(contains("search_hot_keyword"), any(RowMapper.class), eq(5));
    }

    @Test
    void hotKeywords_returnsAnalyticsKeywordsWhenTableEmpty() {
        when(valueOperations.get("search:hot-keywords:5")).thenReturn(null);
        when(jdbcTemplate.query(contains("search_hot_keyword"), any(RowMapper.class), eq(5)))
                .thenReturn(List.of());
        when(jdbcTemplate.query(contains("analytics_event"), any(RowMapper.class), eq(5)))
                .thenReturn(List.of("手办", "一番赏"));

        List<String> keywords = service.hotKeywords(5);

        assertEquals(List.of("手办", "一番赏"), keywords);
    }

    @Test
    void hotKeywords_fallsBackToDefaultsWhenAllEmpty() {
        when(valueOperations.get("search:hot-keywords:4")).thenReturn(null);
        when(jdbcTemplate.query(contains("search_hot_keyword"), any(RowMapper.class), eq(4)))
                .thenReturn(List.of());
        when(jdbcTemplate.query(contains("analytics_event"), any(RowMapper.class), eq(4)))
                .thenReturn(List.of());

        List<String> keywords = service.hotKeywords(4);

        assertEquals(List.of("一番赏", "手办", "新品", "限定"), keywords);
    }
}
