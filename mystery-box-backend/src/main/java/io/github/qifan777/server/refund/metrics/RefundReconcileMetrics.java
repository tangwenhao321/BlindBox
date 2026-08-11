package io.github.qifan777.server.refund.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

/**
 * Micrometer counters for stuck-refund reconciliation job outcomes.
 */
@Component
public class RefundReconcileMetrics {
    private final Counter repaired;
    private final Counter scanned;
    private final Counter failed;
    private final Counter stillStuck;

    public RefundReconcileMetrics(MeterRegistry registry) {
        this.repaired = Counter.builder("mystery_box.refund.reconcile.repaired")
                .description("Stuck REFUNDING records advanced to SUCCESS by reconcile job")
                .register(registry);
        this.scanned = Counter.builder("mystery_box.refund.reconcile.scanned")
                .description("Stuck REFUNDING records scanned by reconcile job")
                .register(registry);
        this.failed = Counter.builder("mystery_box.refund.reconcile.failed")
                .description("Exceptions while retrying stuck refunds in reconcile job")
                .register(registry);
        this.stillStuck = Counter.builder("mystery_box.refund.reconcile.still_stuck")
                .description("Stuck REFUNDING retries that did not finalize (excludes DRAW_INTEGRITY tickets)")
                .register(registry);
    }

    public void repaired() {
        repaired.increment();
    }

    public void scanned() {
        scanned.increment();
    }

    public void failed() {
        failed.increment();
    }

    public void stillStuck() {
        stillStuck.increment();
    }
}
