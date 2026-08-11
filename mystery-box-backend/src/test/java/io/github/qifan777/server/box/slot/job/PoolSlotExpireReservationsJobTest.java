package io.github.qifan777.server.box.slot.job;

import io.github.qifan777.server.box.slot.service.MysteryBoxPoolSlotService;
import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PoolSlotExpireReservationsJobTest {

    @Mock MysteryBoxPoolSlotService mysteryBoxPoolSlotService;
    @Mock JobRunAuditService jobRunAuditService;

    @InjectMocks
    private PoolSlotExpireReservationsJob job;

    @BeforeEach
    void setUp() {
        lenient().doAnswer(invocation -> {
            Runnable runnable = invocation.getArgument(1);
            runnable.run();
            return null;
        }).when(jobRunAuditService).runWithAudit(
                eq("PoolSlotExpireReservationsJob"), org.mockito.ArgumentMatchers.<Runnable>any());
    }

    @Test
    void expiresStaleReservations() {
        when(mysteryBoxPoolSlotService.expireAllStaleReservations()).thenReturn(0);
        job.expireStaleReservations();
        verify(mysteryBoxPoolSlotService).expireAllStaleReservations();
    }
}
