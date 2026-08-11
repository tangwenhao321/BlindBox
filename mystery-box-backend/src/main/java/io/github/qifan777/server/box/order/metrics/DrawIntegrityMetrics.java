package io.github.qifan777.server.box.order.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

/**
 * Micrometer counters for draw fairness / integrity reconciliation.
 */
@Component
public class DrawIntegrityMetrics {
    private final Counter integrityMismatch;

    public DrawIntegrityMetrics(MeterRegistry registry) {
        this.integrityMismatch = Counter.builder("mystery_box.draw.integrity.mismatch")
                .description("Draw integrity reconciliation mismatches")
                .register(registry);
    }

    public void integrityMismatch() {
        integrityMismatch.increment();
    }
}
