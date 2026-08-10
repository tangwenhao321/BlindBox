package io.github.qifan777.server.box.root.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("admin/mystery-box")
@RequiredArgsConstructor
@SaCheckPermission("/mystery-box")
public class MysteryBoxLowStockForAdminController {
    private final JdbcTemplate jdbcTemplate;

    @GetMapping("low-stock-alerts")
    public List<LowStockAlertView> lowStockAlerts(@RequestParam(defaultValue = "5") int threshold) {
        int limit = Math.min(Math.max(threshold, 1), 100);
        return jdbcTemplate.query(
                """
                        SELECT mb.id AS box_id, mb.name AS box_name,
                               p.id AS product_id, p.name AS product_name,
                               r.stock_remaining, r.stock_total
                        FROM mystery_box_product_rel r
                        INNER JOIN mystery_box mb ON mb.id = r.mystery_box_id
                        INNER JOIN product p ON p.id = r.product_id
                        WHERE r.stock_remaining > 0 AND r.stock_remaining <= ?
                        ORDER BY r.stock_remaining ASC, mb.name ASC
                        LIMIT 200
                        """,
                (rs, rowNum) -> new LowStockAlertView(
                        rs.getString("box_id"),
                        rs.getString("box_name"),
                        rs.getString("product_id"),
                        rs.getString("product_name"),
                        rs.getInt("stock_remaining"),
                        rs.getInt("stock_total")
                ),
                limit
        );
    }

    public record LowStockAlertView(
            String boxId,
            String boxName,
            String productId,
            String productName,
            int stockRemaining,
            int stockTotal
    ) {
    }
}
