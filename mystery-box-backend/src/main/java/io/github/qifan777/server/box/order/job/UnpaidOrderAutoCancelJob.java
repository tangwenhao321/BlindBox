package io.github.qifan777.server.box.order.job;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.order.service.MysteryBoxOrderService;
import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Auto-cancel unpaid orders (moved from admin controller).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class UnpaidOrderAutoCancelJob {
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final MysteryBoxOrderService mysteryBoxOrderService;
    private final JobRunAuditService jobRunAuditService;

    @Scheduled(cron = "0 0/1 * * * ?")
    @SchedulerLock(name = "UnpaidOrderAutoCancelJob", lockAtLeastFor = "PT30S", lockAtMostFor = "PT5M")
    public void cancelUnpaidOrders() {
        jobRunAuditService.runWithAudit("UnpaidOrderAutoCancelJob", () -> {
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(new MockHttpServletRequest()));
        try {
            mysteryBoxOrderRepository.findUnpaidOrdersBatch(100).forEach(order -> {
                try {
                    StpUtil.switchTo(order.creator().id());
                    mysteryBoxOrderService.unpaidCancelForUser(order.id());
                } catch (Exception e) {
                    log.error("自动取消订单失败 orderId={}", order.id(), e);
                }
            });
        } finally {
            RequestContextHolder.resetRequestAttributes();
        }
        });
    }
}
