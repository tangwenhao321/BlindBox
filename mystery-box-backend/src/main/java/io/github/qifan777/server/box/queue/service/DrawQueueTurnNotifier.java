package io.github.qifan777.server.box.queue.service;

import io.github.qifan777.server.notification.service.UserNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class DrawQueueTurnNotifier {
    private static final Duration NOTIFY_COOLDOWN = Duration.ofMinutes(2);

    private final StringRedisTemplate redisTemplate;
    private final UserNotificationService userNotificationService;

    public void notifyNextIfReady(String mysteryBoxId) {
        String queueKey = "mystery-box:draw-queue:" + mysteryBoxId;
        var first = redisTemplate.opsForZSet().range(queueKey, 0, 0);
        if (first == null || first.isEmpty()) {
            return;
        }
        String userId = first.iterator().next();
        String dedupeKey = "mystery-box:queue-turn-notified:" + mysteryBoxId + ":" + userId;
        Boolean fresh = redisTemplate.opsForValue().setIfAbsent(dedupeKey, "1", NOTIFY_COOLDOWN);
        if (!Boolean.TRUE.equals(fresh)) {
            return;
        }
        userNotificationService.push(
                userId,
                "QUEUE",
                "排队轮到您了",
                "请尽快进入盒详完成支付开盒",
                mysteryBoxId
        );
    }
}
