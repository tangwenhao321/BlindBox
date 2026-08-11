package io.github.qifan777.server.marketplace.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Micrometer metrics for marketplace external payout safety.
 */
@Component
public class MarketplacePayoutMetrics {
    private final Counter pendingExternalCreated;
    private final Counter pendingExternalCompleted;
    private final Counter pendingExternalFailed;
    private final Counter pendingExternalAgedFailed;
    private final JdbcTemplate jdbcTemplate;

    public MarketplacePayoutMetrics(MeterRegistry registry, JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        this.pendingExternalCreated = Counter.builder("mystery_box.marketplace.pending_external.created")
                .description("Marketplace trades moved to PENDING_EXTERNAL")
                .register(registry);
        this.pendingExternalCompleted = Counter.builder("mystery_box.marketplace.pending_external.completed")
                .description("PENDING_EXTERNAL trades completed by admin")
                .register(registry);
        this.pendingExternalFailed = Counter.builder("mystery_box.marketplace.pending_external.failed")
                .description("PENDING_EXTERNAL trades failed (refund + restore)")
                .register(registry);
        this.pendingExternalAgedFailed = Counter.builder("mystery_box.marketplace.pending_external.aged_failed")
                .description("PENDING_EXTERNAL trades auto-failed by watch job")
                .register(registry);
        Gauge.builder("mystery_box.marketplace.pending_external.count", this, MarketplacePayoutMetrics::countPendingExternal)
                .description("Current PENDING_EXTERNAL marketplace trade count")
                .register(registry);
        Gauge.builder("mystery_box.marketplace.pending_external.oldest_age_hours", this, MarketplacePayoutMetrics::oldestPendingAgeHours)
                .description("Age in hours of the oldest PENDING_EXTERNAL trade")
                .register(registry);
    }

    public void pendingExternalCreated() {
        pendingExternalCreated.increment();
    }

    public void pendingExternalCompleted() {
        pendingExternalCompleted.increment();
    }

    public void pendingExternalFailed() {
        pendingExternalFailed.increment();
    }

    public void pendingExternalAgedFailed() {
        pendingExternalAgedFailed.increment();
    }

    private double countPendingExternal() {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(1) FROM marketplace_trade WHERE status = 'PENDING_EXTERNAL'",
                    Integer.class
            );
            return count == null ? 0 : count;
        } catch (Exception e) {
            return 0;
        }
    }

    private double oldestPendingAgeHours() {
        try {
            Double hours = jdbcTemplate.queryForObject(
                    """
                            SELECT TIMESTAMPDIFF(HOUR, MIN(edited_time), NOW())
                            FROM marketplace_trade
                            WHERE status = 'PENDING_EXTERNAL'
                            """,
                    Double.class
            );
            return hours == null ? 0 : hours;
        } catch (Exception e) {
            return 0;
        }
    }
}
