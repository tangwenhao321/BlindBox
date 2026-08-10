package io.github.qifan777.server.box.queue.service;

import io.github.qifan777.server.notification.service.UserNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.ZSetOperations;

import java.time.Duration;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DrawQueueTurnNotifierTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private UserNotificationService userNotificationService;
    @Mock
    private ZSetOperations<String, String> zSetOperations;
    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private DrawQueueTurnNotifier notifier;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForZSet()).thenReturn(zSetOperations);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    void notifyNextIfReady_sendsWhenDedupeFresh() {
        when(zSetOperations.range("mystery-box:draw-queue:box-1", 0, 0)).thenReturn(Set.of("user-2"));
        when(valueOperations.setIfAbsent("mystery-box:queue-turn-notified:box-1:user-2", "1", Duration.ofMinutes(2)))
                .thenReturn(true);

        notifier.notifyNextIfReady("box-1");

        verify(userNotificationService).push(
                "user-2",
                "QUEUE",
                "排队轮到您了",
                "请尽快进入盒详完成支付开盒",
                "box-1"
        );
    }

    @Test
    void notifyNextIfReady_skipsWhenDedupeExists() {
        when(zSetOperations.range("mystery-box:draw-queue:box-1", 0, 0)).thenReturn(Set.of("user-2"));
        when(valueOperations.setIfAbsent(eq("mystery-box:queue-turn-notified:box-1:user-2"), eq("1"), any(Duration.class)))
                .thenReturn(false);

        notifier.notifyNextIfReady("box-1");

        verify(userNotificationService, never()).push(any(), any(), any(), any(), any());
    }
}
