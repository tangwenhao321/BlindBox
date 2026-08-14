package io.github.qifan777.server.payment.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Real JDBC coverage for payment notify idempotency SQL used by {@link PaymentNotifyLogService}.
 */
@Testcontainers(disabledWithoutDocker = true)
class PaymentNotifyLogJdbcIT {

    @Container
    static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.0")
            .withDatabaseName("notify_it")
            .withUsername("test")
            .withPassword("test");

    private PaymentNotifyLogService service;
    private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        DriverManagerDataSource ds = new DriverManagerDataSource();
        ds.setUrl(MYSQL.getJdbcUrl());
        ds.setUsername(MYSQL.getUsername());
        ds.setPassword(MYSQL.getPassword());
        jdbc = new JdbcTemplate(ds);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS payment_notify_log (
                  id VARCHAR(64) PRIMARY KEY,
                  out_trade_no VARCHAR(64) NOT NULL,
                  transaction_id VARCHAR(128) NULL,
                  notify_type VARCHAR(32) NOT NULL,
                  payload_hash VARCHAR(128) NULL,
                  status VARCHAR(32) NOT NULL,
                  created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  UNIQUE KEY uk_out_type (out_trade_no, notify_type)
                )
                """);
        jdbc.update("DELETE FROM payment_notify_log");
        service = new PaymentNotifyLogService(jdbc);
    }

    @Test
    void tryBegin_firstWins_secondBlocked_failedReclaims() {
        assertThat(service.tryBegin("order-1", "tx-a", "vnpay", "p1")).isTrue();
        assertThat(service.tryBegin("order-1", "tx-b", "vnpay", "p2")).isFalse();

        service.markFailed("order-1", "vnpay");
        assertThat(service.tryBegin("order-1", "tx-c", "vnpay", "p3")).isTrue();

        service.markProcessed("order-1", "vnpay", "p3");
        assertThat(service.tryBegin("order-1", "tx-d", "vnpay", "p4")).isFalse();

        Integer n = jdbc.queryForObject(
                "SELECT COUNT(1) FROM payment_notify_log WHERE out_trade_no = 'order-1'",
                Integer.class
        );
        assertThat(n).isEqualTo(1);
    }
}
