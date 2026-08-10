package io.github.qifan777.server.box.product.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PrizeStockAuditServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;
    @InjectMocks
    private PrizeStockAuditService prizeStockAuditService;

    @Test
    void logChange_writesAuditRow() {
        prizeStockAuditService.logChange(
                "rel-1",
                "box-1",
                "prod-1",
                10,
                8,
                10,
                7,
                false
        );
        verify(jdbcTemplate).update(
                contains("INSERT INTO prize_stock_audit_log"),
                any(),
                eq("rel-1"),
                eq("box-1"),
                eq("prod-1"),
                eq(10),
                eq(8),
                eq(10),
                eq(7),
                eq(0),
                isNull()
        );
    }
}
