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
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pure JDBC Testcontainers coverage for cooling-trade selection SQL
 * used by {@link MarketplaceService#listExpiredCoolingTradeIds(int)}.
 */
@Testcontainers(disabledWithoutDocker = true)
class MarketplaceCoolingQueryJdbcIT {

    @Container
    static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.0")
            .withDatabaseName("marketplace_it")
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
    }

    @Test
    void listExpiredCooling_ordersByCoolingUntil_andRespectsLimit() {
        LocalDateTime now = LocalDateTime.now();
        insertTrade("t-old", "PENDING_COOLING", now.minusHours(2));
        insertTrade("t-mid", "PENDING_COOLING", now.minusMinutes(30));
        insertTrade("t-future", "PENDING_COOLING", now.plusHours(1));
        insertTrade("t-done", "COMPLETED", now.minusHours(3));

        List<String> ids = jdbc.query(
                """
                        SELECT id FROM marketplace_trade
                        WHERE status = 'PENDING_COOLING' AND cooling_until <= ?
                        ORDER BY cooling_until ASC
                        LIMIT ?
                        """,
                (rs, rowNum) -> rs.getString("id"),
                now,
                10
        );

        assertThat(ids).containsExactly("t-old", "t-mid");
    }

    private void insertTrade(String id, String status, LocalDateTime coolingUntil) {
        LocalDateTime ts = LocalDateTime.now();
        jdbc.update(
                """
                        INSERT INTO marketplace_trade (
                          id, listing_id, seller_id, buyer_id, price, fee, seller_proceeds,
                          status, cooling_until, created_time, edited_time
                        ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
                        """,
                id, "L1", "S1", "B1",
                new BigDecimal("100.00"), new BigDecimal("5.00"), new BigDecimal("95.00"),
                status, coolingUntil, ts, ts
        );
    }
}
