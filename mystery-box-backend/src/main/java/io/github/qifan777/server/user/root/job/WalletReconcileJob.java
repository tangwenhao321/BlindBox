package io.github.qifan777.server.user.root.job;

import io.github.qifan777.server.infrastructure.audit.AuditTrailService;
import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import io.github.qifan777.server.user.root.metrics.WalletReconcileMetrics;
import io.github.qifan777.server.user.root.service.UserWalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Samples recent balance-log users and reconciles {@code user.balance} vs signed ledger sum.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WalletReconcileJob {

    private final UserWalletService userWalletService;
    private final JdbcTemplate jdbcTemplate;
    private final JobRunAuditService jobRunAuditService;
    private final AuditTrailService auditTrailService;
    private final WalletReconcileMetrics walletReconcileMetrics;

    @Value("${app.jobs.wallet-reconcile.enabled:true}")
    private boolean enabled;

    @Value("${app.jobs.wallet-reconcile.lookback-hours:48}")
    private int lookbackHours;

    @Value("${app.jobs.wallet-reconcile.sample-size:100}")
    private int sampleSize;

    @Scheduled(cron = "${app.jobs.wallet-reconcile.cron:0 15 3 * * ?}")
    @SchedulerLock(name = "WalletReconcileJob", lockAtLeastFor = "PT2M", lockAtMostFor = "PT30M")
    public void reconcileRecentWalletUsers() {
        if (!enabled) {
            return;
        }
        jobRunAuditService.runWithAudit("WalletReconcileJob", () -> {
            int limit = Math.min(Math.max(sampleSize, 1), 500);
            LocalDateTime since = LocalDateTime.now().minusHours(Math.max(1, lookbackHours));
            List<String> userIds = sampleRecentBalanceLogUsers(since, limit);
            if (userIds.isEmpty()) {
                return;
            }

            List<String> mismatched = new ArrayList<>();
            for (String userId : userIds) {
                if (!StringUtils.hasText(userId)) {
                    continue;
                }
                try {
                    UserWalletService.WalletReconcileResult result = userWalletService.reconcileBalanceVsLogs(userId);
                    if (!result.matched()) {
                        mismatched.add(userId);
                        walletReconcileMetrics.mismatch();
                        log.warn(
                                "wallet reconcile mismatch userId={} balance={} ledgerSum={}",
                                userId,
                                result.userBalance(),
                                result.ledgerSignedSum()
                        );
                    }
                } catch (Exception ex) {
                    mismatched.add(userId);
                    walletReconcileMetrics.mismatch();
                    log.error("wallet reconcile failed userId={}", userId, ex);
                }
            }

            if (!mismatched.isEmpty()) {
                auditTrailService.record(
                        "WALLET_RECONCILE",
                        "system",
                        "user",
                        "*",
                        "",
                        Map.of(
                                "scanned", userIds.size(),
                                "mismatched", mismatched.size(),
                                "sampleUserIds", mismatched.stream().limit(20).toList()
                        )
                );
                log.info(
                        "wallet reconcile done scanned={} mismatched={}",
                        userIds.size(),
                        mismatched.size()
                );
            } else {
                log.debug("wallet reconcile ok scanned={}", userIds.size());
            }
        });
    }

    private List<String> sampleRecentBalanceLogUsers(LocalDateTime since, int limit) {
        try {
            return jdbcTemplate.query(
                    """
                            SELECT user_id
                            FROM user_balance_log
                            WHERE created_time >= ?
                            GROUP BY user_id
                            ORDER BY MAX(created_time) DESC
                            LIMIT ?
                            """,
                    (rs, rowNum) -> rs.getString("user_id"),
                    since,
                    limit
            );
        } catch (Exception ex) {
            log.warn("wallet reconcile sample query failed, falling back to distinct limit: {}", ex.getMessage());
            return jdbcTemplate.query(
                    """
                            SELECT DISTINCT user_id
                            FROM user_balance_log
                            WHERE created_time >= ?
                            LIMIT ?
                            """,
                    (rs, rowNum) -> rs.getString("user_id"),
                    since,
                    limit
            );
        }
    }
}
