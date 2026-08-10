package io.github.qifan777.server.box.product.service;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.IdUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PrizeStockAuditService {
    private final JdbcTemplate jdbcTemplate;

    public void logChange(
            String relId,
            String mysteryBoxId,
            String productId,
            Integer stockTotalBefore,
            Integer stockRemainingBefore,
            int stockTotalAfter,
            int stockRemainingAfter,
            boolean isLastOneAfter
    ) {
        String operatorId = resolveOperatorId();
        jdbcTemplate.update(
                """
                        INSERT INTO prize_stock_audit_log
                        (id, rel_id, mystery_box_id, product_id,
                         stock_total_before, stock_remaining_before,
                         stock_total_after, stock_remaining_after, is_last_one_after, operator_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                IdUtil.fastSimpleUUID(),
                relId,
                mysteryBoxId,
                productId,
                stockTotalBefore,
                stockRemainingBefore,
                stockTotalAfter,
                stockRemainingAfter,
                isLastOneAfter ? 1 : 0,
                operatorId
        );
    }

    private static String resolveOperatorId() {
        try {
            return StpUtil.isLogin() ? StpUtil.getLoginIdAsString() : null;
        } catch (Exception ex) {
            return null;
        }
    }
}
