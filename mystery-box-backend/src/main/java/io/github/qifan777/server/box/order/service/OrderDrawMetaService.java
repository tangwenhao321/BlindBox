package io.github.qifan777.server.box.order.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class OrderDrawMetaService {
    private static final Duration TTL = Duration.ofHours(24);
    private final StringRedisTemplate redisTemplate;

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

    public void saveFairnessSeed(String orderId, String seed) {
        if (orderId == null || seed == null || seed.isBlank()) {
            return;
        }
        redisTemplate.opsForValue().set(fairnessKey(orderId), seed, TTL);
    }

    public String getFairnessSeed(String orderId) {
        return redisTemplate.opsForValue().get(fairnessKey(orderId));
    }

    public void saveSlotNo(String orderId, int slotNo) {
        if (orderId == null || slotNo <= 0) {
            return;
        }
        redisTemplate.opsForValue().set(slotKey(orderId), String.valueOf(slotNo), TTL);
    }

    public Integer getSlotNo(String orderId) {
        String value = redisTemplate.opsForValue().get(slotKey(orderId));
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static String key(String orderId) {
        return "mystery-box:order-draw-mode:" + orderId;
    }

    private static String fairnessKey(String orderId) {
        return "mystery-box:order-fairness-seed:" + orderId;
    }

    private static String slotKey(String orderId) {
        return "mystery-box:order-slot-no:" + orderId;
    }
}
