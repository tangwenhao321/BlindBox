package io.github.qifan777.server.box.product.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("admin/prize-stock-audit")
@RequiredArgsConstructor
@SaCheckPermission("/mystery-box")
public class PrizeStockAuditForAdminController {
    private final JdbcTemplate jdbcTemplate;

    @GetMapping
    public List<Map<String, Object>> list(
            @RequestParam(required = false) String mysteryBoxId,
            @RequestParam(defaultValue = "100") int limit
    ) {
        int size = Math.min(Math.max(limit, 1), 500);
        if (mysteryBoxId != null && !mysteryBoxId.isBlank()) {
            return jdbcTemplate.queryForList(
                    """
                            SELECT id, rel_id, mystery_box_id, product_id,
                                   stock_total_before, stock_remaining_before,
                                   stock_total_after, stock_remaining_after,
                                   is_last_one_after, operator_id, created_time
                            FROM prize_stock_audit_log
                            WHERE mystery_box_id = ?
                            ORDER BY created_time DESC
                            LIMIT ?
                            """,
                    mysteryBoxId,
                    size
            );
        }
        return jdbcTemplate.queryForList(
                """
                        SELECT id, rel_id, mystery_box_id, product_id,
                               stock_total_before, stock_remaining_before,
                               stock_total_after, stock_remaining_after,
                               is_last_one_after, operator_id, created_time
                        FROM prize_stock_audit_log
                        ORDER BY created_time DESC
                        LIMIT ?
                        """,
                size
        );
    }
}
