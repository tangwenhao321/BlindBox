package io.github.qifan777.server.marketplace;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * JDBC coverage for settle claim CAS used by {@link MarketplaceService#settleTrade(String)}.
 */
@Testcontainers(disabledWithoutDocker = true)
class MarketplaceSettleClaimJdbcIT {

    @Container
    static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.0")
            .withDatabaseName("settle_it")
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
                CREATE TABLE IF NOT EXISTS marketplace_trade (
                  id VARCHAR(64) PRIMARY KEY,
                  listing_id VARCHAR(64) NOT NULL,
                  seller_id VARCHAR(64) NOT NULL,
                  buyer_id VARCHAR(64) NOT NULL,
                  price DECIMAL(18,2) NOT NULL,
                  fee DECIMAL(18,2) NOT NULL,
                  seller_proceeds DECIMAL(18,2) NOT NULL,
                  status VARCHAR(32) NOT NULL,
                  cooling_until DATETIME NULL,
                  created_time DATETIME NOT NULL,
                  edited_time DATETIME NOT NULL
                )
                """);
        jdbc.update("DELETE FROM marketplace_trade");
        LocalDateTime ts = LocalDateTime.now();
        jdbc.update(
                """
                        INSERT INTO marketplace_trade (
                          id, listing_id, seller_id, buyer_id, price, fee, seller_proceeds,
                          status, cooling_until, created_time, edited_time
                        ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
                        """,
                "trade-1", "L1", "S1", "B1",
                new BigDecimal("100.00"), new BigDecimal("5.00"), new BigDecimal("95.00"),
                "PENDING_COOLING", ts.minusHours(1), ts, ts
        );
    }

    @Test
    void claimSettle_cas_secondCallerGetsZero() {
        LocalDateTime now = LocalDateTime.now();
        int first = jdbc.update(
                """
                        UPDATE marketplace_trade
                        SET status = 'SETTLING', edited_time = ?
                        WHERE id = ? AND status = 'PENDING_COOLING'
                        """,
                now, "trade-1"
        );
        int second = jdbc.update(
                """
                        UPDATE marketplace_trade
                        SET status = 'SETTLING', edited_time = ?
                        WHERE id = ? AND status = 'PENDING_COOLING'
                        """,
                now, "trade-1"
        );
        assertThat(first).isEqualTo(1);
        assertThat(second).isEqualTo(0);
        String status = jdbc.queryForObject(
                "SELECT status FROM marketplace_trade WHERE id = 'trade-1'",
                String.class
        );
        assertThat(status).isEqualTo("SETTLING");
    }

    @Test
    void rollbackSettling_toPendingCooling_allowsRetry() {
        LocalDateTime now = LocalDateTime.now();
        jdbc.update(
                "UPDATE marketplace_trade SET status = 'SETTLING', edited_time = ? WHERE id = ?",
                now, "trade-1"
        );
        int rolled = jdbc.update(
                """
                        UPDATE marketplace_trade
                        SET status = 'PENDING_COOLING', edited_time = ?
                        WHERE id = ? AND status = 'SETTLING'
                        """,
                now, "trade-1"
        );
        assertThat(rolled).isEqualTo(1);
        int reclaim = jdbc.update(
                """
                        UPDATE marketplace_trade
                        SET status = 'SETTLING', edited_time = ?
                        WHERE id = ? AND status = 'PENDING_COOLING'
                        """,
                now, "trade-1"
        );
        assertThat(reclaim).isEqualTo(1);
    }
}
