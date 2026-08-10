package io.github.qifan777.server.warehouse;

import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.product.root.repository.ProductRepository;
import io.github.qifan777.server.warehouse.metrics.WarehouseMetrics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WarehouseServiceTest {

    @Mock
    private MysteryBoxOrderRepository mysteryBoxOrderRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private WarehouseMetrics warehouseMetrics;

    private WarehouseService service;

    @BeforeEach
    void setUp() {
        service = new WarehouseService(mysteryBoxOrderRepository, productRepository, jdbcTemplate, warehouseMetrics);
    }

    @Test
    void countItems_sqlPath_returnsExactCount() {
        when(jdbcTemplate.queryForObject(contains("mystery_box_order"), eq(Integer.class), eq("user-1")))
                .thenReturn(4);
        when(jdbcTemplate.queryForObject(contains("marketplace_listing"), eq(Integer.class), eq("user-1")))
                .thenReturn(2);

        WarehouseService.WarehouseCountResult result = service.countItems("user-1", false);

        assertEquals(6, result.count());
        assertFalse(result.approximate());
    }

    @Test
    void countItems_pendingOnly_sumsMarketplacePendingCount() {
        when(jdbcTemplate.queryForObject(contains("mystery_box_order"), eq(Integer.class), eq("user-2")))
                .thenReturn(1);
        when(jdbcTemplate.queryForObject(contains("buyer_ship_status"), eq(Integer.class), eq("user-2")))
                .thenReturn(3);

        WarehouseService.WarehouseCountResult result = service.countItems("user-2", true);

        assertEquals(4, result.count());
        assertFalse(result.approximate());
    }
}
