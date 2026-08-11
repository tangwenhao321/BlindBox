package io.github.qifan777.server.box.order.job;

import io.github.qifan777.server.box.order.metrics.DrawIntegrityMetrics;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.order.service.OrderDrawIntegrityService;
import io.github.qifan777.server.infrastructure.audit.AuditTrailService;
import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import io.github.qifan777.server.payment.service.PaymentReliabilityService;
import io.github.qifan777.server.refund.service.RefundRecordService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderDrawIntegrityReconciliationJobTest {

    @Mock MysteryBoxOrderRepository mysteryBoxOrderRepository;
    @Mock OrderDrawIntegrityService orderDrawIntegrityService;
    @Mock AuditTrailService auditTrailService;
    @Mock JobRunAuditService jobRunAuditService;
    @Mock DrawIntegrityMetrics drawIntegrityMetrics;
    @Mock PaymentReliabilityService paymentReliabilityService;
    @Mock RefundRecordService refundRecordService;

    @InjectMocks
    private OrderDrawIntegrityReconciliationJob job;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(job, "enabled", true);
        ReflectionTestUtils.setField(job, "lookbackHours", 24);
        ReflectionTestUtils.setField(job, "batchSize", 200);
        ReflectionTestUtils.setField(job, "emptyRepairMinAgeMinutes", 15);
        lenient().doAnswer(invocation -> {
            Runnable runnable = invocation.getArgument(1);
            runnable.run();
            return null;
        }).when(jobRunAuditService).runWithAudit(
                eq("OrderDrawIntegrityReconciliationJob"), org.mockito.ArgumentMatchers.<Runnable>any());
    }

    @Test
    void skipsWhenDisabled() {
        ReflectionTestUtils.setField(job, "enabled", false);
        job.reconcileRecentPaidOrders();
        verify(jobRunAuditService, never()).runWithAudit(
                eq("OrderDrawIntegrityReconciliationJob"), org.mockito.ArgumentMatchers.<Runnable>any());
        verify(mysteryBoxOrderRepository, never()).findRecentlyPaidOrderIds(any(LocalDateTime.class), anyInt());
    }

    @Test
    void scansRecentPaidOrdersWhenEnabled() {
        when(mysteryBoxOrderRepository.findRecentlyPaidOrderIds(any(LocalDateTime.class), eq(200)))
                .thenReturn(List.of());
        job.reconcileRecentPaidOrders();
        verify(mysteryBoxOrderRepository).findRecentlyPaidOrderIds(any(LocalDateTime.class), eq(200));
    }
}
