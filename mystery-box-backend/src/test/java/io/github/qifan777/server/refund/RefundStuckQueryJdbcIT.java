package io.github.qifan777.server.refund;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * JDBC mirror of stuck-REFUNDING selection semantics used by refund reconciliation.
 */
@Testcontainers(disabledWithoutDocker = true)
class RefundStuckQueryJdbcIT {

    @Container
    static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.0")
            .withDatabaseName("refund_it")
            .withUsername("test")
            .withPassword("test");

    private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        DriverManagerDataSource ds = new DriverManagerDataSource();
        ds.setUrl(MYSQL.getJdbcUrl());
        ds.setUsername(MYSQL.getUsername());
        ds.setPassword(MYSQL.getPassword());
        jdbc = new JdbcTemplate(ds);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS refund_record (
                  id VARCHAR(64) PRIMARY KEY,
                  order_id VARCHAR(64) NOT NULL,
                  amount DECIMAL(18,2) NOT NULL,
                  reason VARCHAR(128) NULL,
                  status VARCHAR(32) NOT NULL,
                  created_time DATETIME NOT NULL
                )
                """);
        jdbc.update("DELETE FROM refund_record");
    }

    @Test
    void selectsOldestStuckRefunding_respectsThresholdAndLimit() {
        LocalDateTime now = LocalDateTime.now();
        insert("r-old", "REFUNDING", now.minusHours(2));
        insert("r-mid", "REFUNDING", now.minusMinutes(40));
        insert("r-fresh", "REFUNDING", now.minusMinutes(2));
        insert("r-ok", "SUCCESS", now.minusHours(3));

        LocalDateTime threshold = now.minusMinutes(10);
        List<String> ids = jdbc.query(
                """
                        SELECT id FROM refund_record
                        WHERE status = 'REFUNDING' AND created_time <= ?
                        ORDER BY created_time ASC
                        LIMIT ?
                        """,
                (rs, rowNum) -> rs.getString("id"),
                threshold,
                10
        );

        assertThat(ids).containsExactly("r-old", "r-mid");
    }

    private void insert(String id, String status, LocalDateTime created) {
        jdbc.update(
                "INSERT INTO refund_record (id, order_id, amount, reason, status, created_time) VALUES (?,?,?,?,?,?)",
                id, "order-" + id, new BigDecimal("10.00"), "TEST", status, created
        );
    }
}
