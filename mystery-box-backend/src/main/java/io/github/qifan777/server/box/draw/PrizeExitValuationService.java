package io.github.qifan777.server.box.draw;

import io.github.qifan777.server.box.order.config.RedeemProperties;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.product.root.entity.Product;
import io.github.qifan777.server.product.root.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

/**
 * Worst-case cash value of one fragment via enabled exchange SKUs
 * (max of SKU product COGS and wallet redeem, never fragment-recurse).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PrizeExitValuationService {
    private final JdbcTemplate jdbcTemplate;
    private final ProductRepository productRepository;
    private final RedeemProperties redeemProperties;
    private final MarketProperties marketProperties;
    private final BoxExpectedValueGuard boxExpectedValueGuard;

    public void applyToGuard() {
        boxExpectedValueGuard.setExitValuation(redeemProperties, fragmentUnitValue());
    }

    public BigDecimal fragmentUnitValue() {
        List<Map<String, Object>> rows;
        try {
            rows = jdbcTemplate.queryForList(
                    """
                            SELECT product_id, fragment_cost, name
                            FROM fragment_exchange_sku
                            WHERE enabled = 1 AND fragment_cost > 0
                            """
            );
        } catch (Exception ex) {
            log.warn("fragment SKU lookup failed: {}", ex.getMessage());
            return BigDecimal.ZERO;
        }
        BigDecimal max = BigDecimal.ZERO;
        String currency = marketProperties.getCurrency();
        for (Map<String, Object> row : rows) {
            int cost = ((Number) row.get("fragment_cost")).intValue();
            if (cost <= 0) {
                continue;
            }
            Product product = resolveSkuProduct(row);
            if (product == null) {
                continue;
            }
            BigDecimal skuCash = PrizeExitLiability.cogs(product)
                    .max(PrizeExitLiability.redeemToWallet(product, redeemProperties, currency));
            if (skuCash.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            BigDecimal perFrag = skuCash.divide(BigDecimal.valueOf(cost), 8, RoundingMode.HALF_UP);
            if (perFrag.compareTo(max) > 0) {
                max = perFrag;
            }
        }
        return max;
    }

    private Product resolveSkuProduct(Map<String, Object> row) {
        Object configured = row.get("product_id");
        if (configured != null && StringUtils.hasText(String.valueOf(configured))) {
            return productRepository.findById(String.valueOf(configured)).orElse(null);
        }
        Object nameObj = row.get("name");
        if (nameObj == null || !StringUtils.hasText(String.valueOf(nameObj))) {
            return null;
        }
        String name = String.valueOf(nameObj);
        List<String> ids = jdbcTemplate.query(
                "SELECT id FROM product WHERE name = ? LIMIT 1",
                (rs, rowNum) -> rs.getString(1),
                name
        );
        if (ids.isEmpty()) {
            return null;
        }
        return productRepository.findById(ids.get(0)).orElse(null);
    }
}
