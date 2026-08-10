package io.github.qifan777.server.warehouse;

import io.github.qifan777.server.logistics.service.LogisticsTrackingService;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class WarehouseShipServiceIntegrationTest {
    @Autowired(required = false)
    private WarehouseShipService warehouseShipService;

    @Autowired(required = false)
    private LogisticsTrackingService logisticsTrackingService;

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    @DynamicPropertySource
    static void datasourceProps(DynamicPropertyRegistry registry) {
        String password = System.getenv().getOrDefault("DEV_DB_PASSWORD", "Admin123#");
        registry.add("spring.datasource.url", () -> "jdbc:mysql://localhost:3306/mystery_box");
        registry.add("spring.datasource.username", () -> "root");
        registry.add("spring.datasource.password", () -> password);
        registry.add("spring.data.redis.url", () -> "redis://127.0.0.1:6379/0");
    }

    private void assumeMysql() {
        Assumptions.assumeTrue(warehouseShipService != null && jdbcTemplate != null);
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        } catch (Exception ex) {
            Assumptions.assumeTrue(false, "MySQL unavailable: " + ex.getMessage());
        }
    }

    @Test
    void contextLoads() {
        assumeMysql();
        assertThat(warehouseShipService).isNotNull();
        assertThat(logisticsTrackingService).isNotNull();
    }

    @Test
    void carrierCodeColumnExists() {
        assumeMysql();
        Integer count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*) FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = 'warehouse_ship_request'
                          AND COLUMN_NAME = 'carrier_code'
                        """,
                Integer.class
        );
        assertThat(count).isEqualTo(1);
    }

    @Test
    void listForUser_returnsEmptyWhenNoRequests() {
        assumeMysql();
        var rows = warehouseShipService.listForUser("__no_such_user__", 10);
        assertThat(rows).isEmpty();
    }

    @Test
    void trackWarehouseShipRequest_notFoundForUnknownId() {
        assumeMysql();
        var result = logisticsTrackingService.trackWarehouseShipRequest("__no_such_user__", "__no_such_request__");
        assertThat(result.latestStatus()).isEqualTo("NOT_FOUND");
        assertThat(result.events()).isEmpty();
    }

    @Test
    void trackByNumber_blankReturnsNoTracking() {
        assumeMysql();
        var result = logisticsTrackingService.trackByNumber("  ", null);
        assertThat(result.latestStatus()).isEqualTo("NO_TRACKING");
        assertThat(result.liveProvider()).isFalse();
    }
}
