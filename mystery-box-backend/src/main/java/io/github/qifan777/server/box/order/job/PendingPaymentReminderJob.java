package io.github.qifan777.server.box.order.job;

import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.notification.service.ExpoPushNotificationService;
import io.github.qifan777.server.notification.service.UserNotificationService;
import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class PendingPaymentReminderJob {
    private static final Duration DEDUPE_TTL = Duration.ofDays(2);

    private final StringRedisTemplate redisTemplate;
    private final UserNotificationService userNotificationService;
    private final ExpoPushNotificationService expoPushNotificationService;
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final JobRunAuditService jobRunAuditService;

    @Scheduled(fixedDelayString = "${app.jobs.pending-payment-reminder-ms:300000}")
    @SchedulerLock(name = "PendingPaymentReminderJob", lockAtLeastFor = "PT1M", lockAtMostFor = "PT15M")
    public void remindUnpaidOrders() {
        jobRunAuditService.runWithAudit("PendingPaymentReminderJob", () -> {
            LocalDateTime threshold = LocalDateTime.now().minusMinutes(14);
            List<ExpoPushNotificationService.PushMessage> batch = new ArrayList<>();
            for (MysteryBoxOrder order : mysteryBoxOrderRepository.findUnpaidOrdersBatch(200)) {
                if (order.createdTime() == null || order.createdTime().isAfter(threshold)) {
                    continue;
                }
                String userId = order.creator().id();
                String dedupeKey = "job:pending-pay:" + userId + ":" + order.id() + ":" + LocalDate.now();
                Boolean fresh = redisTemplate.opsForValue().setIfAbsent(dedupeKey, "1", DEDUPE_TTL);
                if (!Boolean.TRUE.equals(fresh)) {
                    continue;
                }
                String title = "待支付提醒";
                String body = "您有一笔订单即将超时，请尽快完成支付。";
                userNotificationService.persist(userId, "PENDING_PAY", title, body, order.id());
                userNotificationService.preparePushMessage(userId, "PENDING_PAY", title, body, order.id())
                        .ifPresent(batch::add);
                log.info("Pending payment reminder sent userId={} orderId={}", userId, order.id());
            }
            if (!batch.isEmpty()) {
                expoPushNotificationService.sendBatch(batch);
            }
        });
    }
}
