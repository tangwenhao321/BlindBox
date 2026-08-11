package io.github.qifan777.server.box.order.job;

import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.order.service.MysteryBoxOrderService;
import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UnpaidOrderAutoCancelJobTest {

    @Mock MysteryBoxOrderRepository mysteryBoxOrderRepository;
    @Mock MysteryBoxOrderService mysteryBoxOrderService;
    @Mock JobRunAuditService jobRunAuditService;

    @InjectMocks
    private UnpaidOrderAutoCancelJob job;

    @BeforeEach
    void setUp() {
        lenient().doAnswer(invocation -> {
            Runnable runnable = invocation.getArgument(1);
            runnable.run();
            return null;
        }).when(jobRunAuditService).runWithAudit(eq("UnpaidOrderAutoCancelJob"), org.mockito.ArgumentMatchers.<Runnable>any());
    }

    @Test
    void scansUnpaidBatch() {
        when(mysteryBoxOrderRepository.findUnpaidOrdersBatch(100)).thenReturn(List.of());
        job.cancelUnpaidOrders();
        verify(mysteryBoxOrderRepository).findUnpaidOrdersBatch(100);
        verify(jobRunAuditService).runWithAudit(
                eq("UnpaidOrderAutoCancelJob"), org.mockito.ArgumentMatchers.<Runnable>any());
    }
}
