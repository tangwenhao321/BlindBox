package io.github.qifan777.server.box.draw;

import io.github.qifan777.server.box.order.config.RedeemProperties;
import io.github.qifan777.server.dict.model.QualityType;
import io.github.qifan777.server.infrastructure.money.MoneyRounding;
import io.github.qifan777.server.product.root.entity.Product;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Worst-case house liability for one prize: player may keep/ship, redeem to wallet,
 * or decompose to fragments then exchange.
 */
public final class PrizeExitLiability {
    private PrizeExitLiability() {
    }

    public static BigDecimal cogs(Product product) {
        if (product == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal cost = product.costPrice() != null ? product.costPrice() : product.price();
        return cost == null ? BigDecimal.ZERO : cost.max(BigDecimal.ZERO);
    }

    public static int decomposeFragments(QualityType quality, BigDecimal price, String currency) {
        int byQuality = 8;
        if (quality == QualityType.LEGENDARY) {
            byQuality = 50;
        } else if (quality == QualityType.HIDDEN) {
            byQuality = 25;
        }
        if (price == null || price.signum() <= 0) {
            return byQuality;
        }
        String cur = currency == null ? "VND" : currency;
        int priceDivisor = "VND".equalsIgnoreCase(cur) ? 10_000 : 10;
        int byPrice = MoneyRounding.round(price, cur)
                .setScale(0, RoundingMode.HALF_UP)
                .intValue() / priceDivisor;
        byPrice = Math.max(5, Math.min(80, byPrice));
        return Math.max(byQuality, byPrice);
    }

    public static BigDecimal redeemToWallet(Product product, RedeemProperties redeem, String currency) {
        if (product == null || redeem == null || currency == null || currency.isBlank()) {
            return BigDecimal.ZERO;
        }
        BigDecimal amount = redeem.recoveryAmount(product.price(), currency);
        return amount == null ? BigDecimal.ZERO : amount.max(BigDecimal.ZERO);
    }

    /**
     * Max of COGS, wallet redeem, and fragment-exchange cash-out for this prize.
     */
    public static BigDecimal liability(
            Product product,
            RedeemProperties redeem,
            String currency,
            BigDecimal fragmentUnitValue
    ) {
        BigDecimal ship = cogs(product);
        BigDecimal wallet = redeemToWallet(product, redeem, currency);
        int frags = decomposeFragments(product == null ? null : product.qualityType(), product == null ? null : product.price(), currency);
        BigDecimal unit = fragmentUnitValue == null ? BigDecimal.ZERO : fragmentUnitValue.max(BigDecimal.ZERO);
        BigDecimal fragments = unit.multiply(BigDecimal.valueOf(frags));
        return ship.max(wallet).max(fragments);
    }
}
