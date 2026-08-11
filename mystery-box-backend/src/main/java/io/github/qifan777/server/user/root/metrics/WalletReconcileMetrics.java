package io.github.qifan777.server.user.root.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

/**
 * Micrometer metrics for wallet balance-vs-ledger reconciliation.
 */
@Component
public class WalletReconcileMetrics {
    private final Counter mismatch;

    public WalletReconcileMetrics(MeterRegistry registry) {
        this.mismatch = Counter.builder("mystery_box.wallet.reconcile.mismatch")
                .description("Wallet balance vs signed ledger sum mismatches found by reconcile job")
                .register(registry);
    }

    public void mismatch() {
        mismatch.increment();
    }
}
