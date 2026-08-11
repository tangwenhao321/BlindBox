package io.github.qifan777.server.user.root.job;

import io.github.qifan777.server.infrastructure.audit.AuditTrailService;
import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import io.github.qifan777.server.user.root.metrics.WalletReconcileMetrics;
import io.github.qifan777.server.user.root.service.UserWalletService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class WalletReconcileJobTest {

    @Mock
    private UserWalletService userWalletService;
    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private JobRunAuditService jobRunAuditService;
    @Mock
    private AuditTrailService auditTrailService;
    @Mock
    private WalletReconcileMetrics walletReconcileMetrics;

    @InjectMocks
    private WalletReconcileJob job;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(job, "enabled", true);
        ReflectionTestUtils.setField(job, "lookbackHours", 48);
        ReflectionTestUtils.setField(job, "sampleSize", 100);
        org.mockito.Mockito.doAnswer(invocation -> {
            Runnable work = invocation.getArgument(1);
            work.run();
            return null;
        }).when(jobRunAuditService).runWithAudit(anyString(), any(Runnable.class));
    }

    @Test
    void incrementsMismatchMetricWhenBalanceDoesNotMatchLedger() {
        when(jdbcTemplate.query(contains("user_balance_log"), any(RowMapper.class), any(), anyInt()))
                .thenReturn(List.of("user-1"));
        when(userWalletService.reconcileBalanceVsLogs("user-1"))
                .thenReturn(new UserWalletService.WalletReconcileResult(
                        "user-1",
                        new BigDecimal("10.00"),
                        new BigDecimal("9.00"),
                        new BigDecimal("9.00"),
                        false
                ));

        job.reconcileRecentWalletUsers();

        verify(walletReconcileMetrics).mismatch();
        verify(auditTrailService).record(eq("WALLET_RECONCILE"), eq("system"), eq("user"), eq("*"), eq(""), any());
    }
}
