package io.github.qifan777.server.marketplace;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.IntSupplier;

/**
 * Marketplace chat SSE connection and broadcast metrics.
 */
@Component
public class MarketplaceChatMetrics {
    private final Counter connectionsOpened;
    private final Counter connectionsClosed;
    private final Counter broadcasts;
    private final Counter quotaRejected;
    private final AtomicInteger activeConnections = new AtomicInteger();

    public MarketplaceChatMetrics(MeterRegistry registry) {
        this.connectionsOpened = Counter.builder("mystery_box.marketplace.chat.sse.opened")
                .description("Marketplace chat SSE connections opened")
                .register(registry);
        this.connectionsClosed = Counter.builder("mystery_box.marketplace.chat.sse.closed")
                .description("Marketplace chat SSE connections closed")
                .register(registry);
        this.broadcasts = Counter.builder("mystery_box.marketplace.chat.sse.broadcasts")
                .description("Marketplace chat SSE broadcasts")
                .register(registry);
        this.quotaRejected = Counter.builder("mystery_box.marketplace.chat.sse.quota_rejected")
                .description("Marketplace chat SSE quota rejections")
                .register(registry);
        Gauge.builder("mystery_box.marketplace.chat.sse.active", activeConnections, AtomicInteger::get)
                .description("Active marketplace chat SSE connections")
                .register(registry);
    }

    public void opened() {
        connectionsOpened.increment();
        activeConnections.incrementAndGet();
    }

    public void closed() {
        connectionsClosed.increment();
        activeConnections.updateAndGet(n -> Math.max(0, n - 1));
    }

    public void broadcast() {
        broadcasts.increment();
    }

    public void quotaRejected() {
        quotaRejected.increment();
    }

    /** Test helper / optional wiring for hub gauge sync. */
    public IntSupplier activeSupplier() {
        return activeConnections::get;
    }
}
