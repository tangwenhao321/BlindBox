package io.github.qifan777.server.box.order.job;

import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.order.service.PaymentRetentionService;
import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import io.github.qifan777.server.notification.service.ExpoPushNotificationService;
import io.github.qifan777.server.notification.service.UserNotificationService;
import io.github.qifan777.server.payment.config.MarketProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
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
    private final PaymentRetentionService paymentRetentionService;
    private final MarketProperties marketProperties;

    @Value("${app.default-locale:zh-CN}")
    private String defaultLocale;

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
                String title = title();
                String body = buildBody(order);
                userNotificationService.persist(userId, "PENDING_PAY", title, body, order.id());
                batch.addAll(userNotificationService.preparePushMessages(userId, "PENDING_PAY", title, body, order.id()));
                log.info("Pending payment reminder sent userId={} orderId={}", userId, order.id());
            }
            if (!batch.isEmpty()) {
                expoPushNotificationService.sendBatch(batch);
            }
        });
    }

    private boolean viLocale() {
        String locale = defaultLocale == null ? "" : defaultLocale.toLowerCase();
        return locale.startsWith("vi") || marketProperties.isVndMarket();
    }

    private String title() {
        return viLocale() ? "Nhắc thanh toán" : "待支付提醒";
    }

    private String buildBody(MysteryBoxOrder order) {
        BigDecimal pay = order.baseOrder() != null && order.baseOrder().payment() != null
                ? order.baseOrder().payment().payAmount()
                : null;
        BigDecimal claimed = paymentRetentionService.claimedDiscountRaw(order.id());
        String payLabel = pay == null ? "" : marketProperties.formatAmount(pay);
        boolean vi = viLocale();
        if (claimed != null && claimed.signum() > 0) {
            return vi
                    ? ("Đơn sắp hết hạn, ưu đãi giữ chân đã áp dụng, cần thanh toán " + payLabel + ".")
                    : ("您有一笔订单即将超时，挽留优惠已抵扣，应付 " + payLabel + "，请尽快完成支付。");
        }
        if (pay != null && pay.signum() > 0) {
            // Only advertise retention when the user can still claim today (daily quota / amount).
            String userId = order.creator() != null ? order.creator().id() : null;
            PaymentRetentionService.Eligibility eligibility = userId == null
                    ? null
                    : paymentRetentionService.evaluateEligibility(order.id(), userId, order);
            if (eligibility != null && eligibility.eligible() && eligibility.offerDiscount().signum() > 0) {
                String offerLabel = marketProperties.formatAmount(eligibility.offerDiscount());
                return vi
                        ? ("Đơn sắp hết hạn, thanh toán ngay có thể nhận ưu đãi giữ chân " + offerLabel
                        + ". Số tiền hiện tại: " + payLabel + ".")
                        : ("您有一笔订单即将超时，应付 " + payLabel + "；返回支付可领取挽留优惠 "
                        + offerLabel + "。");
            }
            return vi
                    ? ("Đơn sắp hết hạn, cần thanh toán " + payLabel + ".")
                    : ("您有一笔订单即将超时，应付 " + payLabel + "，请尽快完成支付。");
        }
        return vi
                ? "Bạn có đơn chưa thanh toán sắp hết hạn."
                : "您有一笔订单即将超时，请尽快完成支付。";
    }
}
