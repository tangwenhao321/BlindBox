package io.github.qifan777.server.refund.service;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class RefundRecordServiceIntegrationTest {
    @Autowired(required = false)
    private RefundRecordService refundRecordService;

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
        Assumptions.assumeTrue(refundRecordService != null && jdbcTemplate != null);
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        } catch (Exception ex) {
            Assumptions.assumeTrue(false, "MySQL unavailable: " + ex.getMessage());
        }
    }

    @Test
    void timeline_includesAppliedStepWhenRecordExists() {
        assumeMysql();
        var row = jdbcTemplate.query(
                """
                        SELECT id, creator_id FROM refund_record
                        ORDER BY created_time DESC
                        LIMIT 1
                        """,
                rs -> rs.next()
                        ? new Object[]{rs.getString("id"), rs.getString("creator_id")}
                        : null
        );
        Assumptions.assumeTrue(row != null, "no refund_record row");

        String refundId = (String) row[0];
        String userId = (String) row[1];
        var events = refundRecordService.timeline(refundId, userId);
        assertThat(events).isNotEmpty();
        assertThat(events.get(0).step()).isEqualTo("APPLIED");
        assertThat(events.get(0).label()).contains("提交退款");
    }
}
