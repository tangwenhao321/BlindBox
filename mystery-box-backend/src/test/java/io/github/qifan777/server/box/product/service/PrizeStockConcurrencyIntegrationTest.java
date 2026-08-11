package io.github.qifan777.server.box.product.service;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Verifies atomic stock decrement (SET stock_remaining = stock_remaining - 1 WHERE &gt; 0)
 * under concurrent load — same SQL shape as {@link PrizeStockService#consumeRelStock}.
 */
@Testcontainers(disabledWithoutDocker = true)
class PrizeStockConcurrencyIntegrationTest {

    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("mystery_box_test")
            .withUsername("test")
            .withPassword("test");

    private static String jdbcUrl;
    private static String username;
    private static String password;

    @BeforeAll
    static void initSchema() throws Exception {
        jdbcUrl = MYSQL.getJdbcUrl();
        username = MYSQL.getUsername();
        password = MYSQL.getPassword();
        try (Connection conn = open(); Statement st = conn.createStatement()) {
            st.execute("""
                    CREATE TABLE IF NOT EXISTS mystery_box_product_rel (
                        id VARCHAR(32) PRIMARY KEY,
                        mystery_box_id VARCHAR(32) NOT NULL,
                        product_id VARCHAR(32) NOT NULL,
                        stock_total INT NOT NULL DEFAULT 10,
                        stock_remaining INT NOT NULL DEFAULT 10,
                        sort_order INT NOT NULL DEFAULT 0,
                        is_last_one TINYINT(1) NOT NULL DEFAULT 0
                    )
                    """);
            st.execute("""
                    INSERT INTO mystery_box_product_rel (id, mystery_box_id, product_id, stock_total, stock_remaining, sort_order, is_last_one)
                    VALUES ('rel-concurrent', 'box-concurrent', 'prod-concurrent', 5, 5, 0, 0)
                    ON DUPLICATE KEY UPDATE stock_total = 5, stock_remaining = 5
                    """);
        }
    }

    @Test
    void concurrentDecrementNeverOversells() throws Exception {
        resetStock(5);
        int threads = 12;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger successes = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    start.await(10, TimeUnit.SECONDS);
                    if (tryConsumeOnce()) {
                        successes.incrementAndGet();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (Exception e) {
                    throw new RuntimeException(e);
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        assertTrue(done.await(30, TimeUnit.SECONDS), "workers timed out");
        pool.shutdownNow();

        assertEquals(5, successes.get(), "exactly initial stock decrements should succeed");
        assertEquals(0, readRemaining(), "remaining stock must be zero");
    }

    private static void resetStock(int remaining) throws Exception {
        try (Connection conn = open();
             PreparedStatement ps = conn.prepareStatement(
                     "UPDATE mystery_box_product_rel SET stock_remaining = ?, stock_total = ? WHERE id = 'rel-concurrent'")) {
            ps.setInt(1, remaining);
            ps.setInt(2, remaining);
            ps.executeUpdate();
        }
    }

    private static boolean tryConsumeOnce() throws Exception {
        try (Connection conn = open()) {
            conn.setAutoCommit(false);
            try (PreparedStatement upd = conn.prepareStatement("""
                    UPDATE mystery_box_product_rel
                    SET stock_remaining = stock_remaining - 1
                    WHERE id = 'rel-concurrent' AND stock_remaining > 0
                    """)) {
                int updated = upd.executeUpdate();
                if (updated == 0) {
                    conn.rollback();
                    return false;
                }
            }
            conn.commit();
            return true;
        }
    }

    private static int readRemaining() throws Exception {
        try (Connection conn = open();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT stock_remaining FROM mystery_box_product_rel WHERE id = 'rel-concurrent'");
             ResultSet rs = ps.executeQuery()) {
            rs.next();
            return rs.getInt(1);
        }
    }

    private static Connection open() throws Exception {
        return DriverManager.getConnection(jdbcUrl, username, password);
    }
}
