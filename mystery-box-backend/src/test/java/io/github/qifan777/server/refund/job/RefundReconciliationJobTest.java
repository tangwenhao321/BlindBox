package io.github.qifan777.server.refund.job;

import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import io.github.qifan777.server.payment.service.PaymentReliabilityService;
import io.github.qifan777.server.refund.metrics.RefundReconcileMetrics;
import io.github.qifan777.server.refund.repository.RefundRecordRepository;
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
class RefundReconciliationJobTest {

    @Mock RefundRecordRepository refundRecordRepository;
    @Mock RefundRecordService refundRecordService;
    @Mock PaymentReliabilityService paymentReliabilityService;
    @Mock JobRunAuditService jobRunAuditService;
    @Mock RefundReconcileMetrics refundReconcileMetrics;

    @InjectMocks
    private RefundReconciliationJob job;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(job, "enabled", true);
        ReflectionTestUtils.setField(job, "minAgeMinutes", 10);
        ReflectionTestUtils.setField(job, "batchSize", 50);
        lenient().doAnswer(invocation -> {
            Runnable runnable = invocation.getArgument(1);
            runnable.run();
            return null;
        }).when(jobRunAuditService).runWithAudit(eq("RefundReconciliationJob"), org.mockito.ArgumentMatchers.<Runnable>any());
    }

    @Test
    void skipsWhenDisabled() {
        ReflectionTestUtils.setField(job, "enabled", false);
        job.reconcileStuckRefunding();
        verify(jobRunAuditService, never()).runWithAudit(
                eq("RefundReconciliationJob"), org.mockito.ArgumentMatchers.<Runnable>any());
        verify(refundRecordRepository, never()).findStuckRefunding(any(LocalDateTime.class), anyInt());
    }

    @Test
    void scansStuckRefundingWhenEnabled() {
        when(refundRecordRepository.findStuckRefunding(any(LocalDateTime.class), eq(50)))
                .thenReturn(List.of());
        job.reconcileStuckRefunding();
        verify(refundRecordRepository).findStuckRefunding(any(LocalDateTime.class), eq(50));
    }
}
