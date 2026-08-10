package io.github.qifan777.server.box.queue.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DrawQueueServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private DrawQueueTurnNotifier drawQueueTurnNotifier;
    @Mock
    private ZSetOperations<String, String> zSetOperations;
    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private MysteryBoxDrawQueueService service;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForZSet()).thenReturn(zSetOperations);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        ReflectionTestUtils.setField(service, "headTimeoutSec", 120);
        ReflectionTestUtils.setField(service, "queueTtlHours", 2);
        ReflectionTestUtils.setField(service, "lockTtlSec", 120);
    }

    @Test
    void leaveQueueForUser_notifiesNextInLine() {
        when(zSetOperations.rank("mystery-box:draw-queue:box-1", "user-1")).thenReturn(0L);
        when(zSetOperations.zCard("mystery-box:draw-queue:box-1")).thenReturn(1L);

        service.leaveQueueForUser("box-1", "user-1");

        verify(zSetOperations).remove("mystery-box:draw-queue:box-1", "user-1");
        verify(drawQueueTurnNotifier).notifyNextIfReady("box-1");
    }

    @Test
    void queueStatusRecordFields() {
        var status = new MysteryBoxDrawQueueService.QueueStatus(2, 5, 5, 90, false, 90, "u1", 7200, true, 120, 0);
        assertEquals(2, status.position());
        assertEquals(5, status.queueSize());
        assertEquals(90, status.estimatedWaitSec());
        assertEquals(true, status.lockHeldByMe());
    }

    @Test
    void renewQueueRefreshesZsetTtlWhenMemberPresent() {
        when(zSetOperations.rank(anyString(), eq("user-1"))).thenReturn(0L);
        when(zSetOperations.zCard(anyString())).thenReturn(3L);
        when(redisTemplate.getExpire(anyString())).thenReturn(3600L);
        when(valueOperations.get(anyString())).thenReturn(null);

        service.renewQueue("box-1", "user-1");

        verify(redisTemplate).expire(eq("mystery-box:draw-queue:box-1"), eq(Duration.ofHours(2)));
    }

    @Test
    void buyoutLockStatusReturnsTtl() {
        when(valueOperations.get("mystery-box:buyout-lock:box-1")).thenReturn("user-1");
        when(redisTemplate.getExpire("mystery-box:buyout-lock:box-1")).thenReturn(88L);

        MysteryBoxDrawQueueService.BuyoutLockView view = service.buyoutLockStatus("box-1");
        assertEquals("user-1", view.holderUserId());
        assertEquals(88, view.lockTtlSeconds());
    }

    @Test
    void statusMarksCanDrawOnlyForFirstInQueue() {
        when(zSetOperations.range(anyString(), eq(0L), eq(0L))).thenReturn(java.util.Collections.emptySet());
        when(zSetOperations.rank(anyString(), eq("user-1"))).thenReturn(0L);
        when(zSetOperations.zCard(anyString())).thenReturn(2L);
        when(redisTemplate.getExpire(anyString())).thenReturn(100L);
        when(valueOperations.get(anyString())).thenReturn(null);

        MysteryBoxDrawQueueService.QueueStatus status = service.status("box-1", "user-1");
        assertEquals(1, status.position());
        assertEquals(2, status.queueSize());
        assertEquals(0, status.estimatedWaitSec());
        assertEquals(true, status.canDraw());
    }

    @Test
    void statusMarksCannotDrawWhenNotFirst() {
        when(zSetOperations.range(anyString(), eq(0L), eq(0L))).thenReturn(java.util.Collections.emptySet());
        when(zSetOperations.rank(anyString(), eq("user-2"))).thenReturn(1L);
        when(zSetOperations.zCard(anyString())).thenReturn(2L);
        when(redisTemplate.getExpire(anyString())).thenReturn(100L);
        when(valueOperations.get(anyString())).thenReturn(null);

        MysteryBoxDrawQueueService.QueueStatus status = service.status("box-1", "user-2");
        assertEquals(2, status.position());
        assertEquals(90, status.estimatedWaitSec());
        assertFalse(status.canDraw());
    }
}
