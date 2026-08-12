package io.github.qifan777.server.risk.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Iterator;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * Order-create risk scoring plus a light velocity gate and device-graph check.
 * <p>
 * Velocity prefers Redis INCR+EXPIRE (key-per-window) when available; falls back to
 * an in-memory sliding window when Redis is absent or down.
 * <p>
 * Call sites with {@code HttpServletRequest} should pass a resolved client IP
 * (via {@code ClientIpResolver}) as {@code ip}, not raw {@code getRemoteAddr()} when behind a trusted proxy.
 * Optional {@code phoneHash} can be supplied when available (login / OTP flows); otherwise pass null.
 */
@Service
@Slf4j
public class RiskControlService {
    private final JdbcTemplate jdbcTemplate;

    /** Sliding-window timestamps keyed by dimension (device / ip / phoneHash). */
    private final ConcurrentHashMap<String, Deque<Long>> velocityWindows = new ConcurrentHashMap<>();

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    @Value("${security.risk-control.enabled:true}")
    private boolean enabled;
    @Value("${security.risk-control.confirm-threshold:80}")
    private int confirmThreshold;
    /** Max actions per key inside the sliding window before hard reject. */
    @Value("${security.risk-control.velocity-threshold:8}")
    private int velocityThreshold;
    /** Sliding window length in milliseconds (default 60s). */
    @Value("${security.risk-control.velocity-window-ms:60000}")
    private long velocityWindowMs;
    /** Max distinct users sharing a device within 24h before hard block. */
    @Value("${security.risk-control.device-user-limit:5}")
    private int deviceUserLimit;

    public RiskControlService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public RiskDecision evaluateOrderAction(String userId, String deviceId, String ip) {
        return evaluateOrderAction(userId, deviceId, ip, null);
    }

    /**
     * @param phoneHash optional hashed phone; counted in the same sliding-window velocity map when present
     */
    public RiskDecision evaluateOrderAction(String userId, String deviceId, String ip, String phoneHash) {
        if (!enabled) {
            return new RiskDecision(0, false, false, "disabled");
        }

        long now = System.currentTimeMillis();
        if (exceedsVelocity("device", deviceId, now)
                || exceedsVelocity("ip", ip, now)
                || exceedsVelocity("phone", phoneHash, now)) {
            return new RiskDecision(100, true, true, "velocity_exceeded");
        }

        if (StringUtils.hasText(deviceId) && exceedsDeviceUserLimit(deviceId.trim())) {
            return new RiskDecision(100, true, true, "device_multi_user");
        }

        int score = 0;
        if (deviceId == null || deviceId.isBlank()) {
            score += 30;
        }
        if (ip == null || ip.isBlank()) {
            score += 10;
        }
        Integer recentCreate = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM mystery_box_order WHERE creator_id = ? AND created_time >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)",
                Integer.class,
                userId == null ? "" : userId
        );
        if (recentCreate != null && recentCreate > 4) {
            score += 60;
        } else if (recentCreate != null && recentCreate > 2) {
            score += 35;
        }
        return new RiskDecision(score, score >= confirmThreshold, false, "recentCreate=" + (recentCreate == null ? 0 : recentCreate));
    }

    /**
     * Upsert {@code user_device_link} when {@code x-device-id} is present (register / order flows).
     */
    public void touchDeviceLink(String userId, String deviceId) {
        if (!StringUtils.hasText(userId) || !StringUtils.hasText(deviceId)) {
            return;
        }
        try {
            jdbcTemplate.update(
                    """
                            INSERT INTO user_device_link (user_id, device_id, last_seen, created_time)
                            VALUES (?, ?, NOW(6), NOW(6))
                            ON DUPLICATE KEY UPDATE last_seen = NOW(6)
                            """,
                    userId.trim(),
                    deviceId.trim()
            );
        } catch (Exception ex) {
            log.debug("user_device_link upsert failed: {}", ex.getMessage());
        }
    }

    /**
     * True when another account sharing this user's devices has already paid an order.
     * Used to blunt multi-account newcomer subsidy farming.
     */
    public boolean linkedDevicesHaveOtherPaidUsers(String userId) {
        if (!StringUtils.hasText(userId)) {
            return false;
        }
        try {
            Integer count = jdbcTemplate.queryForObject(
                    """
                            SELECT EXISTS(
                                SELECT 1
                                FROM user_device_link mine
                                INNER JOIN user_device_link other
                                        ON other.device_id = mine.device_id
                                       AND other.user_id <> mine.user_id
                                INNER JOIN payment p
                                        ON p.creator_id = other.user_id
                                       AND p.pay_time IS NOT NULL
                                WHERE mine.user_id = ?
                            )
                            """,
                    Integer.class,
                    userId.trim()
            );
            return count != null && count > 0;
        } catch (Exception ex) {
            log.warn("linkedDevicesHaveOtherPaidUsers failed (fail-closed): {}", ex.getMessage());
            return true;
        }
    }

    private boolean exceedsDeviceUserLimit(String deviceId) {
        int limit = Math.max(deviceUserLimit, 1);
        try {
            Integer distinctUsers = jdbcTemplate.queryForObject(
                    """
                            SELECT COUNT(DISTINCT user_id) FROM user_device_link
                            WHERE device_id = ? AND last_seen >= DATE_SUB(NOW(6), INTERVAL 24 HOUR)
                            """,
                    Integer.class,
                    deviceId
            );
            return distinctUsers != null && distinctUsers > limit;
        } catch (Exception ex) {
            log.warn("device multi-user check failed (fail-closed): {}", ex.getMessage());
            return true;
        }
    }

    private boolean exceedsVelocity(String dimension, String rawKey, long now) {
        if (rawKey == null || rawKey.isBlank()) {
            return false;
        }
        String key = dimension + ":" + rawKey.trim();
        if (redisTemplate != null) {
            try {
                return exceedsVelocityRedis(key, now);
            } catch (Exception ex) {
                // Redis is multi-node source of truth — fail closed (treat as over limit).
                log.warn("risk velocity redis failed (fail-closed): {}", ex.getMessage());
                return true;
            }
        }
        return exceedsVelocityMemory(key, now);
    }

    /** Fixed key-per-window via INCR + EXPIRE (compatible when Redis is shared across instances). */
    private boolean exceedsVelocityRedis(String key, long now) {
        long windowMs = Math.max(velocityWindowMs, 1L);
        long bucket = now / windowMs;
        String redisKey = "risk:vel:" + key + ":" + bucket;
        Long count = redisTemplate.opsForValue().increment(redisKey);
        if (count != null && count == 1L) {
            redisTemplate.expire(redisKey, Math.max(windowMs * 2 / 1000L, 2L), TimeUnit.SECONDS);
        }
        return count != null && count > Math.max(velocityThreshold, 1);
    }

    private boolean exceedsVelocityMemory(String key, long now) {
        Deque<Long> window = velocityWindows.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (window) {
            prune(window, now);
            window.addLast(now);
            return window.size() > Math.max(velocityThreshold, 1);
        }
    }

    private void prune(Deque<Long> window, long now) {
        long cutoff = now - Math.max(velocityWindowMs, 1L);
        Iterator<Long> it = window.iterator();
        while (it.hasNext()) {
            if (it.next() < cutoff) {
                it.remove();
            } else {
                break;
            }
        }
    }

    public record RiskDecision(
            int score,
            boolean requireConfirm,
            boolean blocked,
            String reason
    ) {
        /** Backward-compatible 3-arg shape used by older call sites / tests. */
        public RiskDecision(int score, boolean requireConfirm, String reason) {
            this(score, requireConfirm, false, reason);
        }
    }
}
