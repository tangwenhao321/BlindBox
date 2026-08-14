package io.github.qifan777.server.leaderboard.service;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;
import io.github.qifan777.server.leaderboard.model.LeaderboardMeView;
import io.github.qifan777.server.user.privacy.NicknameMaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class DrawLeaderboardService {
    private static final long CACHE_TTL_MS = 60_000L;
    private static final String REDIS_KEY_PREFIX = "draw:leaderboard:";

    private final JdbcTemplate jdbcTemplate;
    private final NicknameMaskService nicknameMaskService;
    private final StringRedisTemplate redisTemplate;
    private final JsonMapper objectMapper;
    private final ConcurrentHashMap<String, CachedLeaderboard> localCache = new ConcurrentHashMap<>();

    public void invalidateCaches() {
        localCache.clear();
        try {
            List<String> keys = new ArrayList<>();
            ScanOptions options = ScanOptions.scanOptions().match(REDIS_KEY_PREFIX + "*").count(200).build();
            try (Cursor<String> cursor = redisTemplate.scan(options)) {
                while (cursor.hasNext()) {
                    keys.add(cursor.next());
                }
            }
            if (!keys.isEmpty()) {
                redisTemplate.delete(keys);
            }
        } catch (Exception ignored) {
            // Redis optional at runtime
        }
    }

    public LeaderboardPageView page(String mysteryBoxId, String period, int page, int size) {
        String cacheKey = (mysteryBoxId == null ? "" : mysteryBoxId) + "|" + (period == null ? "week" : period) + "|" + page + "|" + size;
        if (page == 0) {
            LeaderboardPageView cached = readCache(cacheKey);
            if (cached != null) {
                return cached;
            }
        }
        LeaderboardPageView result = queryPage(mysteryBoxId, period, page, size);
        if (page == 0) {
            writeCache(cacheKey, result);
        }
        return result;
    }

    private LeaderboardPageView readCache(String cacheKey) {
        LeaderboardPageView fromRedis = readRedis(cacheKey);
        if (fromRedis != null) {
            return fromRedis;
        }
        CachedLeaderboard cached = localCache.get(cacheKey);
        if (cached != null && System.currentTimeMillis() - cached.atMs < CACHE_TTL_MS) {
            return cached.page;
        }
        return null;
    }

    private void writeCache(String cacheKey, LeaderboardPageView result) {
        writeRedis(cacheKey, result);
        localCache.put(cacheKey, new CachedLeaderboard(result, System.currentTimeMillis()));
    }

    private LeaderboardPageView readRedis(String cacheKey) {
        try {
            String json = redisTemplate.opsForValue().get(REDIS_KEY_PREFIX + cacheKey);
            if (json == null || json.isBlank()) {
                return null;
            }
            return objectMapper.readValue(json, LeaderboardPageView.class);
        } catch (Exception ignored) {
            return null;
        }
    }

    private void writeRedis(String cacheKey, LeaderboardPageView result) {
        try {
            String json = objectMapper.writeValueAsString(result);
            redisTemplate.opsForValue().set(REDIS_KEY_PREFIX + cacheKey, json, Duration.ofSeconds(60));
        } catch (JacksonException ignored) {
            // skip redis write
        }
    }

    private LeaderboardPageView queryPage(String mysteryBoxId, String period, int page, int size) {
        LocalDateTime since = switch (period == null ? "week" : period.toLowerCase()) {
            case "month" -> LocalDateTime.now().minusDays(30);
            default -> LocalDateTime.now().minusDays(7);
        };
        int pageNum = Math.max(page, 0);
        int pageSize = size <= 0 ? 20 : Math.min(size, 50);
        int offset = pageNum * pageSize;
        String countSql = """
                SELECT COUNT(1) FROM (
                    SELECT l.user_id
                    FROM mystery_box_draw_log l
                    WHERE l.created_time >= ?
                      AND l.quality_type IN ('LEGENDARY', 'HIDDEN')
                """;
        String dataSql = """
                SELECT l.user_id, COUNT(1) AS high_count
                FROM mystery_box_draw_log l
                WHERE l.created_time >= ?
                  AND l.quality_type IN ('LEGENDARY', 'HIDDEN')
                """;
        if (mysteryBoxId != null && !mysteryBoxId.isBlank()) {
            countSql += " AND l.mystery_box_id = ? GROUP BY l.user_id) t";
            dataSql += " AND l.mystery_box_id = ? GROUP BY l.user_id ORDER BY high_count DESC LIMIT ? OFFSET ?";
            Long totalBox = jdbcTemplate.queryForObject(
                    countSql,
                    Long.class,
                    since,
                    mysteryBoxId
            );
            long totalValBox = totalBox == null ? 0 : totalBox;
            List<LeaderboardEntryView> items = jdbcTemplate.query(
                    dataSql,
                    (rs, rowNum) -> new LeaderboardEntryView(
                            offset + rowNum + 1,
                            nicknameMaskService.maskUserId(rs.getString("user_id"), "欧皇"),
                            rs.getInt("high_count")
                    ),
                    since,
                    mysteryBoxId,
                    pageSize,
                    offset
            );
            return new LeaderboardPageView(
                    items,
                    pageNum,
                    pageSize,
                    totalValBox,
                    (long) pageNum * pageSize + items.size() < totalValBox
            );
        }
        countSql += " GROUP BY l.user_id) t";
        dataSql += " GROUP BY l.user_id ORDER BY high_count DESC LIMIT ? OFFSET ?";
        Long total = jdbcTemplate.queryForObject(countSql, Long.class, since);
        List<LeaderboardEntryView> items = jdbcTemplate.query(
                dataSql,
                (rs, rowNum) -> new LeaderboardEntryView(
                        offset + rowNum + 1,
                        nicknameMaskService.maskUserId(rs.getString("user_id"), "欧皇"),
                        rs.getInt("high_count")
                ),
                since,
                pageSize,
                offset
        );
        long totalVal = total == null ? 0 : total;
        return new LeaderboardPageView(items, pageNum, pageSize, totalVal, (long) pageNum * pageSize + items.size() < totalVal);
    }

    public List<LeaderboardEntryView> weekly(String mysteryBoxId) {
        return page(mysteryBoxId, "week", 0, 20).items();
    }

    public LeaderboardMeView me(String userId, String mysteryBoxId) {
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        String sql = """
                SELECT high_count, rk FROM (
                    SELECT l.user_id, COUNT(1) AS high_count,
                           RANK() OVER (ORDER BY COUNT(1) DESC) AS rk
                    FROM mystery_box_draw_log l
                    WHERE l.created_time >= ?
                      AND l.quality_type IN ('LEGENDARY', 'HIDDEN')
                """;
        Object[] args;
        if (mysteryBoxId != null && !mysteryBoxId.isBlank()) {
            sql += " AND l.mystery_box_id = ? GROUP BY l.user_id) t WHERE user_id = ?";
            args = new Object[]{since, mysteryBoxId, userId};
        } else {
            sql += " GROUP BY l.user_id) t WHERE user_id = ?";
            args = new Object[]{since, userId};
        }
        List<LeaderboardMeView> rows = jdbcTemplate.query(
                sql,
                (rs, rowNum) -> {
                    int rank = rs.getInt("rk");
                    int count = rs.getInt("high_count");
                    String title = rank == 1 ? "本周欧皇" : rank <= 3 ? "传说猎人" : rank <= 10 ? "高玩" : "冲榜中";
                    return new LeaderboardMeView(rank, count, title, true);
                },
                args
        );
        if (rows.isEmpty()) {
            return new LeaderboardMeView(0, 0, "冲榜中", false);
        }
        return rows.get(0);
    }

    private record CachedLeaderboard(LeaderboardPageView page, long atMs) {
    }

    public record LeaderboardEntryView(int rank, String nickname, int highCount) {
    }

    public record LeaderboardPageView(
            List<LeaderboardEntryView> items,
            int page,
            int size,
            long total,
            boolean hasMore
    ) {
    }
}
