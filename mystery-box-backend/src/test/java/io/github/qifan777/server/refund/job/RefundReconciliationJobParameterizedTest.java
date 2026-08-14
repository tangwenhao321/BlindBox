package io.github.qifan777.server.refund.job;

import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import io.github.qifan777.server.payment.service.PaymentReliabilityService;
import io.github.qifan777.server.refund.entity.RefundRecord;
import io.github.qifan777.server.refund.metrics.RefundReconcileMetrics;
import io.github.qifan777.server.refund.repository.RefundRecordRepository;
import io.github.qifan777.server.refund.service.RefundRecordService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RefundReconciliationJobParameterizedTest {

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

    @ParameterizedTest(name = "retryResult={0} drawIntegrity={1}")
    @CsvSource({
            "true,false,repaired",
            "false,false,stuck",
            "false,true,drawWait"
    })
    void reconcile_metricsByOutcome(boolean retryOk, boolean drawIntegrity, String expect) {
        RefundRecord record = mock(RefundRecord.class);
        when(record.id()).thenReturn("rf-1");
        when(record.orderId()).thenReturn("order-1");
        when(record.creator()).thenReturn(null);
        when(record.reason()).thenReturn(
                drawIntegrity ? RefundRecordService.DRAW_INTEGRITY_EMPTY_REASON : "USER_CANCEL");
        when(refundRecordRepository.findStuckRefunding(any(LocalDateTime.class), eq(50)))
                .thenReturn(List.of(record));
        when(refundRecordService.retryStuckRefunding("rf-1")).thenReturn(retryOk);

        job.reconcileStuckRefunding();

        verify(refundReconcileMetrics).scanned();
        if ("repaired".equals(expect)) {
            verify(refundReconcileMetrics).repaired();
            verify(refundReconcileMetrics, never()).stillStuck();
        } else if ("stuck".equals(expect)) {
            verify(refundReconcileMetrics).stillStuck();
            verify(refundReconcileMetrics, never()).repaired();
        } else {
            verify(refundReconcileMetrics, never()).repaired();
            verify(refundReconcileMetrics, never()).stillStuck();
        }
    }

    @ParameterizedTest(name = "batchSize={0} -> clamped query size={1}")
    @CsvSource({"0,1", "50,50", "999,200"})
    void batchSizeClamped(int configured, int expectedQuery) {
        ReflectionTestUtils.setField(job, "batchSize", configured);
        when(refundRecordRepository.findStuckRefunding(any(LocalDateTime.class), eq(expectedQuery)))
                .thenReturn(List.of());
        job.reconcileStuckRefunding();
        verify(refundRecordRepository, times(1)).findStuckRefunding(any(LocalDateTime.class), eq(expectedQuery));
        verify(refundRecordService, never()).retryStuckRefunding(anyString());
    }
}
