package io.github.qifan777.server.box.slot.job;

import io.github.qifan777.server.box.slot.service.MysteryBoxPoolSlotService;
import io.github.qifan777.server.infrastructure.audit.AuditTrailService;
import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PoolSlotReconciliationJobTest {

    @Mock MysteryBoxPoolSlotService mysteryBoxPoolSlotService;
    @Mock AuditTrailService auditTrailService;
    @Mock JobRunAuditService jobRunAuditService;

    @InjectMocks
    private PoolSlotReconciliationJob job;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(job, "autoFix", false);
        lenient().doAnswer(invocation -> {
            Runnable runnable = invocation.getArgument(1);
            runnable.run();
            return null;
        }).when(jobRunAuditService).runWithAudit(
                eq("PoolSlotReconciliationJob"), org.mockito.ArgumentMatchers.<Runnable>any());
    }

    @Test
    void runsReconcile() {
        when(mysteryBoxPoolSlotService.reconcile())
                .thenReturn(new MysteryBoxPoolSlotService.ReconcileResult(0, List.of()));
        job.reconcilePoolSlots();
        verify(mysteryBoxPoolSlotService).reconcile();
    }
}
