package io.github.qifan777.server.box.product.service;

import io.github.qifan777.server.ServerApplication;
import io.github.qifan777.server.box.draw.cache.DrawPublicCacheInvalidator;
import io.github.qifan777.server.support.AbstractMysqlRedisSpringBootIT;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.jdbc.core.JdbcTemplate;
import io.qifan.infrastructure.common.exception.BusinessException;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;

@SpringBootTest(
        classes = ServerApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = "spring.profiles.active=test"
)
class PrizeStockServiceSpringIntegrationTest extends AbstractMysqlRedisSpringBootIT {

    @Autowired
    private PrizeStockService prizeStockService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockitoBean
    private DrawPublicCacheInvalidator drawPublicCacheInvalidator;

    private static final String BOX_ID = "box-it-1";
    private static final String USER_ID = "user-it-1";
    private static final String PROD_GENERAL = "prod-gen-1";
    private static final String CAT_ID = "cat-it-1";

    @BeforeEach
    void seed() {
        doNothing().when(drawPublicCacheInvalidator).invalidateAfterDraw(any());
        jdbcTemplate.update("DELETE FROM mystery_box_draw_log WHERE mystery_box_id = ?", BOX_ID);
        jdbcTemplate.update("DELETE FROM mystery_box_product_rel WHERE mystery_box_id = ?", BOX_ID);
        jdbcTemplate.update("DELETE FROM mystery_box WHERE id = ?", BOX_ID);
        jdbcTemplate.update("DELETE FROM product WHERE id = ?", PROD_GENERAL);
        jdbcTemplate.update("DELETE FROM user WHERE id = ?", USER_ID);

        jdbcTemplate.update(
                "INSERT INTO user (id, phone, password, created_time, edited_time) VALUES (?,?,?,?,?)",
                USER_ID, "13800000001", "x", LocalDateTime.now(), LocalDateTime.now()
        );
        jdbcTemplate.update(
                "INSERT INTO mystery_box_category (id, name, sort_order, created_time, edited_time) VALUES (?,?,0,?,?)",
                CAT_ID, "IT", LocalDateTime.now(), LocalDateTime.now()
        );
        jdbcTemplate.update(
                """
                        INSERT INTO mystery_box (id, name, details, tips, price, legendary_rate, hidden_rate, general_rate,
                        cover, newcomer_exclusive, pool_total, pool_remaining, pity_threshold, category_id, created_time, edited_time)
                        VALUES (?,?,?,?,?,?,?,?,?,0,100,100,50,?,?,?)
                        """,
                BOX_ID, "IT Box", "", "", BigDecimal.TEN, 0, 0, 10000, "",
                CAT_ID, LocalDateTime.now(), LocalDateTime.now()
        );
        jdbcTemplate.update(
                """
                        INSERT INTO product (id, name, price, cover, quality_type, created_time, edited_time)
                        VALUES (?,?,?,?,?,?,?)
                        """,
                PROD_GENERAL, "普通赏", BigDecimal.ONE, "", "GENERAL", LocalDateTime.now(), LocalDateTime.now()
        );
        jdbcTemplate.update(
                """
                        INSERT INTO mystery_box_product_rel (id, mystery_box_id, product_id, stock_total, stock_remaining, sort_order, is_last_one, created_time, edited_time)
                        VALUES (?,?,?,?,?,?,0,?,?)
                        """,
                "rel-it-1", BOX_ID, PROD_GENERAL, 5, 5, 0, LocalDateTime.now(), LocalDateTime.now()
        );
    }

    @Test
    void drawAndConsumeReducesStock() {
        var drawn = prizeStockService.drawAndConsume(USER_ID, BOX_ID, "order-it-1", 3, false);
        assertEquals(3, drawn.size());
        Integer remaining = jdbcTemplate.queryForObject(
                "SELECT stock_remaining FROM mystery_box_product_rel WHERE id = 'rel-it-1'",
                Integer.class
        );
        assertEquals(2, remaining);
        Integer logs = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM mystery_box_draw_log WHERE mystery_box_order_id = 'order-it-1'",
                Integer.class
        );
        assertEquals(3, logs);
    }

    @Test
    void assertStockAvailableRejectsOverDraw() {
        assertThrows(BusinessException.class, () -> prizeStockService.assertStockAvailable(BOX_ID, 99));
    }

    @Test
    void drawExhaustsStock_thenRejectsFurtherDraw() {
        var first = prizeStockService.drawAndConsume(USER_ID, BOX_ID, "order-it-ex-1", 5, false);
        assertEquals(5, first.size());
        Integer remaining = jdbcTemplate.queryForObject(
                "SELECT stock_remaining FROM mystery_box_product_rel WHERE id = 'rel-it-1'",
                Integer.class
        );
        assertEquals(0, remaining);
        assertThrows(BusinessException.class,
                () -> prizeStockService.drawAndConsume(USER_ID, BOX_ID, "order-it-ex-2", 1, false));
    }
}
