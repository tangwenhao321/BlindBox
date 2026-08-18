package io.github.qifan777.server.box.draw;

import io.github.qifan777.server.box.order.config.RedeemProperties;
import io.github.qifan777.server.box.pack.model.DrawPackConfigView;
import io.github.qifan777.server.dict.model.QualityType;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.infrastructure.money.MoneyRounding;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.product.root.entity.Product;
import io.qifan.infrastructure.common.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * House-edge gate: expected prize cost must stay under
 * effective unit revenue × (1 − minMargin − referralCommission − maxDiscount).
 * Cost is max(COGS, wallet redeem, fragment-exchange cash-out), including pack discounts,
 * worst-case dynamic odds, and amortized pity forceHigh cost.
 */
@Component
public class BoxExpectedValueGuard {
    private static final int BASE = DynamicProbabilityAdjuster.PROBABILITY_BASE;

    private final MarketProperties marketProperties;
    private RedeemProperties redeemProperties;
    private BigDecimal fragmentUnitValue = BigDecimal.ZERO;

    public BoxExpectedValueGuard(MarketProperties marketProperties) {
        this.marketProperties = marketProperties;
    }

    /** Wallet redeem + fragment exchange must be included so config EV cannot go negative vs player exits. */
    public void setExitValuation(RedeemProperties redeemProperties, BigDecimal fragmentUnitValue) {
        this.redeemProperties = redeemProperties;
        this.fragmentUnitValue = fragmentUnitValue == null ? BigDecimal.ZERO : fragmentUnitValue.max(BigDecimal.ZERO);
    }

    @Value("${app.draw.min-margin-ratio:0.15}")
    private BigDecimal minMarginRatio = new BigDecimal("0.15");

    /** Referral payout share of GMV — haircut from unit revenue before EV gate. */
    @Value("${app.referral.commission-rate:0.05}")
    private BigDecimal referralCommissionRate = new BigDecimal("0.05");

    /**
     * Conservative max discount vs list price (coupons / retention). Applied as extra revenue haircut
     * so config-time EV still holds after typical checkout discounts.
     */
    @Value("${app.draw.max-discount-ratio:0.20}")
    private BigDecimal maxDiscountRatio = new BigDecimal("0.20");

    public void assertRatesSum(int legendaryRate, int hiddenRate, int generalRate) {
        if (legendaryRate < 0 || hiddenRate < 0 || generalRate < 0) {
            throw new BusinessException("概率不能为负数");
        }
        if (legendaryRate + hiddenRate + generalRate != BASE) {
            throw new BusinessException(
                    "概率配置错误：legendary+hidden+general 必须等于 " + BASE
                            + "（当前 " + (legendaryRate + hiddenRate + generalRate) + "）");
        }
    }

    /** Backward-compatible single-draw check (no packs / pity). */
    public void assertProfitable(
            BigDecimal boxPrice,
            int legendaryRate,
            int hiddenRate,
            int generalRate,
            List<Product> products
    ) {
        assertProfitable(boxPrice, legendaryRate, hiddenRate, generalRate, products, 0, List.of(), null);
    }

    public void assertProfitable(
            BigDecimal boxPrice,
            int legendaryRate,
            int hiddenRate,
            int generalRate,
            List<Product> products,
            int pityThreshold,
            List<DrawPackConfigView> packs,
            DynamicProbabilityAdjuster adjuster
    ) {
        assertRatesSum(legendaryRate, hiddenRate, generalRate);
        if (boxPrice == null || boxPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("盲盒售价必须大于 0");
        }
        if (products == null || products.isEmpty()) {
            throw new BusinessException("盲盒至少需要一件奖品");
        }
        if (legendaryRate > 0 && avgTierCost(products, QualityType.LEGENDARY) == null) {
            throw new BusinessException("传奇概率 > 0 但未配置传奇品质奖品");
        }
        if (hiddenRate > 0 && avgTierCost(products, QualityType.HIDDEN) == null) {
            throw new BusinessException("隐藏概率 > 0 但未配置隐藏品质奖品");
        }
        if (generalRate > 0 && avgTierCost(products, QualityType.GENERAL) == null) {
            throw new BusinessException("普通概率 > 0 但未配置普通品质奖品");
        }

        BigDecimal margin = minMarginRatio == null ? BigDecimal.ZERO : minMarginRatio.max(BigDecimal.ZERO);
        if (margin.compareTo(BigDecimal.ONE) >= 0) {
            margin = new BigDecimal("0.15");
        }
        BigDecimal commission = referralCommissionRate == null
                ? BigDecimal.ZERO
                : referralCommissionRate.max(BigDecimal.ZERO);
        if (commission.compareTo(new BigDecimal("0.5")) > 0) {
            commission = new BigDecimal("0.05");
        }
        BigDecimal discount = maxDiscountRatio == null
                ? BigDecimal.ZERO
                : maxDiscountRatio.max(BigDecimal.ZERO);
        if (discount.compareTo(new BigDecimal("0.8")) > 0) {
            discount = new BigDecimal("0.20");
        }
        BigDecimal haircut = margin.add(commission).add(discount);
        if (haircut.compareTo(BigDecimal.ONE) >= 0) {
            haircut = margin.add(commission);
            if (haircut.compareTo(BigDecimal.ONE) >= 0) {
                haircut = margin;
            }
        }

        List<Scenario> scenarios = buildScenarios(boxPrice, packs);
        for (Scenario scenario : scenarios) {
            DynamicProbabilityAdjuster.AdjustedRates rates = resolveRates(
                    legendaryRate, hiddenRate, generalRate, scenario.drawCount(), adjuster);
            BigDecimal ev = expectedPrizeValue(
                    rates.legendaryRate(), rates.hiddenRate(), rates.generalRate(), products);
            ev = ev.add(pityAmortization(ev, products, rates, pityThreshold));
            if (fragmentUnitValue.compareTo(BigDecimal.ZERO) > 0) {
                // Doc2 surprise-theme grants +1 fragment per paid open.
                ev = ev.add(fragmentUnitValue);
            }
            BigDecimal maxEv = scenario.unitRevenue().multiply(BigDecimal.ONE.subtract(haircut));
            if (ev.compareTo(maxEv) > 0) {
                String currency = marketProperties.getCurrency();
                throw new BusinessException(
                        "EV_GATE: 期望奖品成本 " + MoneyRounding.round(ev, currency)
                                + " 超过有效单价毛利闸门 " + MoneyRounding.round(maxEv, currency)
                                + "（场景抽数=" + scenario.drawCount()
                                + " 有效单价=" + MoneyRounding.round(scenario.unitRevenue(), currency)
                                + " × (1−margin " + margin + " −referral " + commission
                                + " −discount " + discount
                                + ")；成本优先 costPrice）");
            }
        }
    }

    private List<Scenario> buildScenarios(BigDecimal boxPrice, List<DrawPackConfigView> packs) {
        List<Scenario> out = new ArrayList<>();
        out.add(new Scenario(1, boxPrice));
        if (packs == null) {
            return out;
        }
        for (DrawPackConfigView pack : packs) {
            if (pack == null || !pack.enabled() || pack.drawCount() < 1) {
                continue;
            }
            BigDecimal total = pack.applyDiscount(boxPrice, marketProperties.getCurrency());
            BigDecimal unit = total.divide(BigDecimal.valueOf(pack.drawCount()), 8, RoundingMode.HALF_UP);
            out.add(new Scenario(pack.drawCount(), unit));
        }
        return out;
    }

    private DynamicProbabilityAdjuster.AdjustedRates resolveRates(
            int legendaryRate,
            int hiddenRate,
            int generalRate,
            int drawCount,
            DynamicProbabilityAdjuster adjuster
    ) {
        if (adjuster == null) {
            return new DynamicProbabilityAdjuster.AdjustedRates(legendaryRate, hiddenRate, generalRate);
        }
        // Worst-case player EV within cap: full streak + off-peak + multi-draw when applicable.
        return adjuster.adjust(
                legendaryRate,
                hiddenRate,
                generalRate,
                new DynamicProbabilityAdjuster.AdjustContext(
                        0,
                        DynamicProbabilityAdjuster.STREAK_FULL_DRAWS,
                        Math.max(1, drawCount),
                        12,
                        false
                )
        );
    }

    /**
     * Amortize forceHigh: each pity wall eventually pays avg high-tier cost instead of base EV.
     * Extra per draw ≈ max(0, avgHigh − EV) / threshold.
     */
    BigDecimal pityAmortization(
            BigDecimal baseEv,
            List<Product> products,
            DynamicProbabilityAdjuster.AdjustedRates rates,
            int pityThreshold
    ) {
        if (pityThreshold <= 0 || baseEv == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal avgHigh = weightedHighCost(products, rates);
        if (avgHigh == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal gap = avgHigh.subtract(baseEv);
        if (gap.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        return gap.divide(BigDecimal.valueOf(pityThreshold), 8, RoundingMode.HALF_UP);
    }

    private BigDecimal weightedHighCost(List<Product> products, DynamicProbabilityAdjuster.AdjustedRates rates) {
        BigDecimal l = avgTierCost(products, QualityType.LEGENDARY);
        BigDecimal h = avgTierCost(products, QualityType.HIDDEN);
        int lw = Math.max(0, rates.legendaryRate());
        int hw = Math.max(0, rates.hiddenRate());
        int sum = lw + hw;
        if (sum <= 0) {
            return null;
        }
        BigDecimal total = BigDecimal.ZERO;
        if (l != null && lw > 0) {
            total = total.add(l.multiply(BigDecimal.valueOf(lw)));
        } else if (lw > 0) {
            return null;
        }
        if (h != null && hw > 0) {
            total = total.add(h.multiply(BigDecimal.valueOf(hw)));
        } else if (hw > 0 && l == null) {
            return null;
        }
        if (l == null && h == null) {
            return null;
        }
        int denom = (l != null ? lw : 0) + (h != null ? hw : 0);
        if (denom <= 0) {
            return null;
        }
        return total.divide(BigDecimal.valueOf(denom), 8, RoundingMode.HALF_UP);
    }

    public BigDecimal expectedPrizeValue(
            int legendaryRate,
            int hiddenRate,
            int generalRate,
            List<Product> products
    ) {
        BigDecimal ev = BigDecimal.ZERO;
        ev = ev.add(tierContribution(legendaryRate, products, QualityType.LEGENDARY));
        ev = ev.add(tierContribution(hiddenRate, products, QualityType.HIDDEN));
        ev = ev.add(tierContribution(generalRate, products, QualityType.GENERAL));
        return ev;
    }

    private BigDecimal tierContribution(int rate, List<Product> products, QualityType tier) {
        if (rate <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal avg = avgTierCost(products, tier);
        if (avg == null) {
            return BigDecimal.ZERO;
        }
        return avg.multiply(BigDecimal.valueOf(rate))
                .divide(BigDecimal.valueOf(BASE), 8, RoundingMode.HALF_UP);
    }

    /** Prefer max(COGS, wallet redeem, fragment exchange) so player exits cannot beat the house. */
    private BigDecimal avgTierCost(List<Product> products, QualityType tier) {
        BigDecimal sum = BigDecimal.ZERO;
        int n = 0;
        String currency = marketProperties.getCurrency();
        for (Product p : products) {
            if (p == null || p.qualityType() != tier) {
                continue;
            }
            BigDecimal cost = PrizeExitLiability.liability(p, redeemProperties, currency, fragmentUnitValue);
            if (cost.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            sum = sum.add(cost);
            n++;
        }
        if (n == 0) {
            return null;
        }
        return sum.divide(BigDecimal.valueOf(n), 8, RoundingMode.HALF_UP);
    }

    private record Scenario(int drawCount, BigDecimal unitRevenue) {
    }
}
