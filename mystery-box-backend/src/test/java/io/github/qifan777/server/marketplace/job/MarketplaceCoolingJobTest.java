package io.github.qifan777.server.marketplace.job;

import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import io.github.qifan777.server.marketplace.MarketplaceService;
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
class MarketplaceCoolingJobTest {

    @Mock MarketplaceService marketplaceService;
    @Mock JobRunAuditService jobRunAuditService;

    @InjectMocks
    private MarketplaceCoolingJob job;

    @BeforeEach
    void setUp() {
        lenient().doAnswer(invocation -> {
            JobRunAuditService.JobRunner<?> runner = invocation.getArgument(1);
            return runner.run();
        }).when(jobRunAuditService).runWithAudit(
                eq("MarketplaceCoolingJob"),
                org.mockito.ArgumentMatchers.<JobRunAuditService.JobRunner<?>>any());
    }

    @Test
    void listsExpiredCoolingTrades() {
        when(marketplaceService.listExpiredCoolingTradeIds(50)).thenReturn(List.of());
        job.settleCoolingTrades();
        verify(marketplaceService).listExpiredCoolingTradeIds(50);
    }
}
