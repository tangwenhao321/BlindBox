package io.github.qifan777.server.box.order.service;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class PaymentRetentionServiceIntegrationTest {

    @Autowired(required = false)
    private PaymentRetentionService paymentRetentionService;

    @Autowired(required = false)
    private MysteryBoxOrderRepository mysteryBoxOrderRepository;

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
        Assumptions.assumeTrue(paymentRetentionService != null && jdbcTemplate != null);
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        } catch (Exception ex) {
            Assumptions.assumeTrue(false, "MySQL unavailable: " + ex.getMessage());
        }
    }

    @Test
    void claimedDiscountReturnsStoredAmount() {
        assumeMysql();
        Assumptions.assumeTrue(mysteryBoxOrderRepository != null);
        var unpaid = mysteryBoxOrderRepository.findUnpaidOrder();
        Assumptions.assumeFalse(unpaid.isEmpty(), "No unpaid order for retention test");

        MysteryBoxOrder order = unpaid.get(0);
        String orderId = order.id();
        String userId = order.creator().id();
        jdbcTemplate.update("DELETE FROM order_payment_retention_claim WHERE order_id = ?", orderId);
        StpUtil.login(userId);
        try {
            PaymentRetentionService.AbandonOfferView offer = paymentRetentionService.claimAbandonOffer(orderId);
            assertThat(offer.granted()).isTrue();
            assertThat(offer.discountAmount()).isGreaterThan(BigDecimal.ZERO);
            assertThat(paymentRetentionService.claimedDiscount(orderId)).isEqualByComparingTo(offer.discountAmount());
        } finally {
            StpUtil.logout();
        }
    }
}
