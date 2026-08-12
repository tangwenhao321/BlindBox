package io.github.qifan777.server.box.order.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderDrawMetaService {
    private static final Duration TTL = Duration.ofHours(24);
    private final StringRedisTemplate redisTemplate;
    private final JdbcTemplate jdbcTemplate;

    public void saveDrawMode(String orderId, String drawMode) {
        if (orderId == null || drawMode == null) {
            return;
        }
        redisTemplate.opsForValue().set(key(orderId), drawMode, TTL);
    }

    public String getDrawMode(String orderId) {
        String value = redisTemplate.opsForValue().get(key(orderId));
        return value == null ? "instant" : value;
    }

    /** Persist fairness seed + public commit in DB (source of truth) and Redis (fast path). Never regenerate on miss. */
    public void saveFairnessSeed(String orderId, String seed) {
        saveFairnessSeed(orderId, seed, null);
    }

    public void saveFairnessSeed(String orderId, String seed, String commit) {
        if (orderId == null || seed == null || seed.isBlank()) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update(
                """
                        INSERT INTO order_draw_meta (order_id, fairness_seed, fairness_commit, pool_reserved, created_time, edited_time)
                        VALUES (?, ?, ?, 0, ?, ?)
                        ON DUPLICATE KEY UPDATE fairness_seed = VALUES(fairness_seed),
                          fairness_commit = COALESCE(VALUES(fairness_commit), fairness_commit),
                          edited_time = VALUES(edited_time)
                        """,
                orderId,
                seed,
                commit,
                now,
                now
        );
        redisTemplate.opsForValue().set(fairnessKey(orderId), seed, TTL);
        if (commit != null && !commit.isBlank()) {
            redisTemplate.opsForValue().set(fairnessCommitKey(orderId), commit, TTL);
        }
    }

    public String getFairnessCommit(String orderId) {
        if (orderId == null || orderId.isBlank()) {
            return null;
        }
        String cached = redisTemplate.opsForValue().get(fairnessCommitKey(orderId));
        if (cached != null && !cached.isBlank()) {
            return cached;
        }
        List<String> rows = jdbcTemplate.query(
                "SELECT fairness_commit FROM order_draw_meta WHERE order_id = ? LIMIT 1",
                (rs, i) -> rs.getString(1),
                orderId
        );
        if (rows.isEmpty()) {
            return null;
        }
        String commit = rows.get(0);
        if (commit != null && !commit.isBlank()) {
            redisTemplate.opsForValue().set(fairnessCommitKey(orderId), commit, TTL);
        }
        return commit;
    }

    public String getFairnessSeed(String orderId) {
        if (orderId == null || orderId.isBlank()) {
            return null;
        }
        String cached = redisTemplate.opsForValue().get(fairnessKey(orderId));
        if (cached != null && !cached.isBlank()) {
            return cached;
        }
        List<String> rows = jdbcTemplate.query(
                "SELECT fairness_seed FROM order_draw_meta WHERE order_id = ? LIMIT 1",
                (rs, i) -> rs.getString(1),
                orderId
        );
        if (rows.isEmpty()) {
            return null;
        }
        String seed = rows.get(0);
        if (seed != null && !seed.isBlank()) {
            redisTemplate.opsForValue().set(fairnessKey(orderId), seed, TTL);
        }
        return seed;
    }

    public void markPoolReserved(String orderId) {
        if (orderId == null || orderId.isBlank()) {
            return;
        }
        jdbcTemplate.update(
                """
                        UPDATE order_draw_meta SET pool_reserved = 1, edited_time = ? WHERE order_id = ?
                        """,
                LocalDateTime.now(),
                orderId
        );
    }

    public boolean isPoolReserved(String orderId) {
        if (orderId == null || orderId.isBlank()) {
            return false;
        }
        List<Integer> rows = jdbcTemplate.query(
                "SELECT pool_reserved FROM order_draw_meta WHERE order_id = ? LIMIT 1",
                (rs, i) -> rs.getInt(1),
                orderId
        );
        return !rows.isEmpty() && rows.get(0) != null && rows.get(0) == 1;
    }

    public void clearPoolReserved(String orderId) {
        if (orderId == null || orderId.isBlank()) {
            return;
        }
        jdbcTemplate.update(
                "UPDATE order_draw_meta SET pool_reserved = 0, edited_time = ? WHERE order_id = ?",
                LocalDateTime.now(),
                orderId
        );
    }

    /** Persist slot_no in DB (source of truth) and Redis (fast path), same pattern as fairness seed. */
    public void saveSlotNo(String orderId, int slotNo) {
        if (orderId == null || slotNo <= 0) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        int updated = jdbcTemplate.update(
                "UPDATE order_draw_meta SET slot_no = ?, edited_time = ? WHERE order_id = ?",
                slotNo,
                now,
                orderId
        );
        if (updated == 0) {
            // Fairness seed usually inserted first; if not, placeholder seed until saveFairnessSeed.
            jdbcTemplate.update(
                    """
                            INSERT INTO order_draw_meta (order_id, fairness_seed, pool_reserved, slot_no, created_time, edited_time)
                            VALUES (?, 'PENDING', 0, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE slot_no = VALUES(slot_no), edited_time = VALUES(edited_time)
                            """,
                    orderId,
                    slotNo,
                    now,
                    now
            );
        }
        redisTemplate.opsForValue().set(slotKey(orderId), String.valueOf(slotNo), TTL);
    }

    public Integer getSlotNo(String orderId) {
        if (orderId == null || orderId.isBlank()) {
            return null;
        }
        String cached = redisTemplate.opsForValue().get(slotKey(orderId));
        if (cached != null && !cached.isBlank()) {
            try {
                return Integer.parseInt(cached);
            } catch (NumberFormatException ex) {
                // fall through to DB
            }
        }
        List<Integer> rows = jdbcTemplate.query(
                "SELECT slot_no FROM order_draw_meta WHERE order_id = ? LIMIT 1",
                (rs, i) -> {
                    int value = rs.getInt(1);
                    return rs.wasNull() ? null : value;
                },
                orderId
        );
        if (rows.isEmpty() || rows.get(0) == null) {
            return null;
        }
        Integer slotNo = rows.get(0);
        redisTemplate.opsForValue().set(slotKey(orderId), String.valueOf(slotNo), TTL);
        return slotNo;
    }

    private static String key(String orderId) {
        return "mystery-box:order-draw-mode:" + orderId;
    }

    private static String fairnessKey(String orderId) {
        return "mystery-box:order-fairness-seed:" + orderId;
    }

    private static String fairnessCommitKey(String orderId) {
        return "mystery-box:order-fairness-commit:" + orderId;
    }

    private static String slotKey(String orderId) {
        return "mystery-box:order-slot-no:" + orderId;
    }
}
