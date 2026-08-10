package io.github.qifan777.server.box.order;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class OrderIdMigrationServiceIntegrationTest {

    @Autowired(required = false)
    private OrderIdMigrationService orderIdMigrationService;

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
        Assumptions.assumeTrue(orderIdMigrationService != null && jdbcTemplate != null);
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        } catch (Exception ex) {
            Assumptions.assumeTrue(false, "MySQL unavailable: " + ex.getMessage());
        }
    }

    @Test
    void preflight_reportsSchemaObjects() {
        assumeMysql();
        OrderIdMigrationService.MigrationPreflightView preflight = orderIdMigrationService.preflight();
        assertThat(preflight.missingObjects()).isNotNull();
        if (preflight.ready()) {
            assertThat(preflight.legacyMapTableReady()).isTrue();
            assertThat(preflight.migrationLogTableReady()).isTrue();
            assertThat(preflight.warehouseIndexesReady()).isTrue();
        }
    }

    @Test
    void listMigrationLog_doesNotThrowWhenTablePresent() {
        assumeMysql();
        var preflight = orderIdMigrationService.preflight();
        Assumptions.assumeTrue(preflight.migrationLogTableReady(), "order_id_migration_log missing");
        assertThat(orderIdMigrationService.listMigrationLog(5)).isNotNull();
    }
}
