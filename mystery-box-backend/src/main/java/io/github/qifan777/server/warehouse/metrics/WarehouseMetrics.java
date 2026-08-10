package io.github.qifan777.server.warehouse.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

@Component
public class WarehouseMetrics {
    private final Counter countSqlFallback;
    private final Counter listSqlFallback;

    public WarehouseMetrics(MeterRegistry registry) {
        this.countSqlFallback = Counter.builder("mystery_box.warehouse.count_sql_fallback")
                .description("Warehouse item count fell back to in-memory scan")
                .register(registry);
        this.listSqlFallback = Counter.builder("mystery_box.warehouse.list_sql_fallback")
                .description("Warehouse item list fell back to in-memory scan")
                .register(registry);
    }

    public void countSqlFallback() {
        countSqlFallback.increment();
    }

    public void listSqlFallback() {
        listSqlFallback.increment();
    }
}
