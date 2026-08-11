package io.github.qifan777.server.user.auth;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Per-phone password login lockout. Redis when available; in-memory fallback for single-node/dev.
 */
@Component
@Slf4j
public class LoginLockoutService {
    private static final String FAIL_KEY = "auth:login:fail:";
    private static final String LOCK_KEY = "auth:login:lock:";

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    @Value("${app.auth.login-max-failures:5}")
    private int maxFailures;

    @Value("${app.auth.login-lock-minutes:15}")
    private int lockMinutes;

    private final ConcurrentHashMap<String, AtomicInteger> localFails = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> localLocks = new ConcurrentHashMap<>();

    public boolean isLocked(String phone) {
        String key = normalize(phone);
        if (!StringUtils.hasText(key)) {
            return false;
        }
        if (redisTemplate != null) {
            try {
                return Boolean.TRUE.equals(redisTemplate.hasKey(LOCK_KEY + key));
            } catch (Exception ex) {
                log.warn("login lock check failed phoneHash={}", hash(key), ex);
            }
        }
        Long until = localLocks.get(key);
        if (until == null) {
            return false;
        }
        if (until <= System.currentTimeMillis()) {
            localLocks.remove(key);
            localFails.remove(key);
            return false;
        }
        return true;
    }

    public void recordFailure(String phone) {
        String key = normalize(phone);
        if (!StringUtils.hasText(key)) {
            return;
        }
        int max = Math.max(1, maxFailures);
        long lockMs = Math.max(1, lockMinutes) * 60_000L;
        if (redisTemplate != null) {
            try {
                String failKey = FAIL_KEY + key;
                Long count = redisTemplate.opsForValue().increment(failKey);
                if (count != null && count == 1L) {
                    redisTemplate.expire(failKey, lockMs, TimeUnit.MILLISECONDS);
                }
                if (count != null && count >= max) {
                    redisTemplate.opsForValue().set(LOCK_KEY + key, "1", lockMs, TimeUnit.MILLISECONDS);
                    redisTemplate.delete(failKey);
                }
                return;
            } catch (Exception ex) {
                log.warn("login fail record redis failed phoneHash={}", hash(key), ex);
            }
        }
        AtomicInteger counter = localFails.computeIfAbsent(key, k -> new AtomicInteger(0));
        if (counter.incrementAndGet() >= max) {
            localLocks.put(key, System.currentTimeMillis() + lockMs);
            localFails.remove(key);
        }
    }

    public void clear(String phone) {
        String key = normalize(phone);
        if (!StringUtils.hasText(key)) {
            return;
        }
        if (redisTemplate != null) {
            try {
                redisTemplate.delete(FAIL_KEY + key);
                redisTemplate.delete(LOCK_KEY + key);
            } catch (Exception ex) {
                log.warn("login lock clear failed phoneHash={}", hash(key), ex);
            }
        }
        localFails.remove(key);
        localLocks.remove(key);
    }

    private static String normalize(String phone) {
        return phone == null ? "" : phone.trim();
    }

    private static String hash(String phone) {
        return Integer.toHexString(phone.hashCode());
    }
}
