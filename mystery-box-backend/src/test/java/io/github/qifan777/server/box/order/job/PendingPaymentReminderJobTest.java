package io.github.qifan777.server.box.order.job;

import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import io.github.qifan777.server.notification.service.ExpoPushNotificationService;
import io.github.qifan777.server.notification.service.UserNotificationService;
import io.github.qifan777.server.user.root.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PendingPaymentReminderJobTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private UserNotificationService userNotificationService;
    @Mock
    private ExpoPushNotificationService expoPushNotificationService;
    @Mock
    private MysteryBoxOrderRepository mysteryBoxOrderRepository;
    @Mock
    private JobRunAuditService jobRunAuditService;
    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private PendingPaymentReminderJob job;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        doAnswer(invocation -> {
            Runnable runnable = invocation.getArgument(1);
            runnable.run();
            return null;
        }).when(jobRunAuditService).runWithAudit(eq("PendingPaymentReminderJob"), org.mockito.ArgumentMatchers.<Runnable>any());
    }

    @Test
    void remindUnpaidOrders_usesRedisDedupPerUserAndOrder() {
        MysteryBoxOrder order = mock(MysteryBoxOrder.class);
        User creator = mock(User.class);
        when(order.id()).thenReturn("order-1");
        when(order.createdTime()).thenReturn(LocalDateTime.now().minusMinutes(20));
        when(order.creator()).thenReturn(creator);
        when(creator.id()).thenReturn("user-1");
        when(mysteryBoxOrderRepository.findUnpaidOrdersBatch(200)).thenReturn(List.of(order));
        when(valueOperations.setIfAbsent(contains("job:pending-pay:user-1:order-1"), eq("1"), any(Duration.class)))
                .thenReturn(true);
        ExpoPushNotificationService.PushMessage message = new ExpoPushNotificationService.PushMessage(
                "user-1",
                "待支付提醒",
                "您有一笔订单即将超时，请尽快完成支付。",
                "PENDING_PAY",
                "order-1",
                "ExponentPushToken[abc]"
        );
        when(userNotificationService.preparePushMessage(
                "user-1",
                "PENDING_PAY",
                "待支付提醒",
                "您有一笔订单即将超时，请尽快完成支付。",
                "order-1"
        )).thenReturn(Optional.of(message));

        job.remindUnpaidOrders();

        verify(userNotificationService).persist(
                "user-1",
                "PENDING_PAY",
                "待支付提醒",
                "您有一笔订单即将超时，请尽快完成支付。",
                "order-1"
        );
        verify(expoPushNotificationService).sendBatch(List.of(message));
    }

    @Test
    void remindUnpaidOrders_skipsWhenRedisDedupeHit() {
        MysteryBoxOrder order = mock(MysteryBoxOrder.class);
        User creator = mock(User.class);
        when(order.id()).thenReturn("order-2");
        when(order.createdTime()).thenReturn(LocalDateTime.now().minusMinutes(20));
        when(order.creator()).thenReturn(creator);
        when(creator.id()).thenReturn("user-2");
        when(mysteryBoxOrderRepository.findUnpaidOrdersBatch(200)).thenReturn(List.of(order));
        when(valueOperations.setIfAbsent(contains("job:pending-pay:user-2:order-2"), eq("1"), any(Duration.class)))
                .thenReturn(false);

        job.remindUnpaidOrders();

        verify(userNotificationService, never()).persist(any(), any(), any(), any(), any());
        verify(expoPushNotificationService, never()).sendBatch(anyList());
    }
}
