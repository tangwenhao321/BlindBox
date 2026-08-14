package io.github.qifan777.server.box.draw;

import io.github.qifan777.server.dict.model.QualityType;

import io.github.qifan777.server.box.pack.model.DrawPackConfigView;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.product.root.entity.Product;
import io.qifan.infrastructure.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class BoxExpectedValueGuardTest {

    private BoxExpectedValueGuard guard;
    private DynamicProbabilityAdjuster adjuster;

    @BeforeEach
    void setUp() {
        MarketProperties market = mock(MarketProperties.class);
        when(market.getCurrency()).thenReturn("VND");
        guard = new BoxExpectedValueGuard(market);
        ReflectionTestUtils.setField(guard, "minMarginRatio", new BigDecimal("0.15"));
        ReflectionTestUtils.setField(guard, "referralCommissionRate", new BigDecimal("0.05"));
        ReflectionTestUtils.setField(guard, "maxDiscountRatio", BigDecimal.ZERO);
        adjuster = new DynamicProbabilityAdjuster();
        ReflectionTestUtils.setField(adjuster, "dynamicBoostCapPercent", 25);
    }

    @Test
    void rejectsBadRateSum() {
        assertThrows(BusinessException.class, () -> guard.assertRatesSum(1, 1, 1));
    }

    @Test
    void acceptsProfitableConfig() {
        Product legendary = product(QualityType.LEGENDARY, "500", null);
        Product hidden = product(QualityType.HIDDEN, "100", null);
        Product general = product(QualityType.GENERAL, "10", null);
        assertDoesNotThrow(() -> guard.assertProfitable(
                new BigDecimal("100"),
                100,
                500,
                9400,
                List.of(legendary, hidden, general),
                80,
                List.of(),
                adjuster
        ));
    }

    @Test
    void prefersCostPriceOverRetail() {
        Product legendary = product(QualityType.LEGENDARY, "10000", "20");
        Product general = product(QualityType.GENERAL, "10", "1");
        // With retail would fail; with COGS should pass on box 100.
        assertDoesNotThrow(() -> guard.assertProfitable(
                new BigDecimal("100"),
                100,
                0,
                9900,
                List.of(legendary, general)
        ));
    }

    @Test
    void rejectsWhenPackDiscountBreaksMargin() {
        Product legendary = product(QualityType.LEGENDARY, "80", null);
        Product general = product(QualityType.GENERAL, "40", null);
        // Base EV high relative to discounted pack unit price.
        DrawPackConfigView pack = new DrawPackConfigView("p1", 10, "10", 9000, true, 1);
        assertThrows(BusinessException.class, () -> guard.assertProfitable(
                new BigDecimal("50"),
                2000,
                0,
                8000,
                List.of(legendary, general),
                50,
                List.of(pack),
                adjuster
        ));
    }

    @Test
    void rejectsWhenEvExceedsMargin() {
        Product legendary = product(QualityType.LEGENDARY, "10000", null);
        Product general = product(QualityType.GENERAL, "10", null);
        assertThrows(BusinessException.class, () -> guard.assertProfitable(
                new BigDecimal("100"),
                5000,
                0,
                5000,
                List.of(legendary, general)
        ));
    }

    @Test
    void rejectsWhenCouponHaircutBreaksMargin() {
        ReflectionTestUtils.setField(guard, "maxDiscountRatio", new BigDecimal("0.50"));
        Product legendary = product(QualityType.LEGENDARY, "80", null);
        Product general = product(QualityType.GENERAL, "40", null);
        // EV ≈ 0.2*80 + 0.8*40 = 48; list maxEv at 50% discount haircut + 20% margin/referral = 50*(1-0.7)=15 → reject
        assertThrows(BusinessException.class, () -> guard.assertProfitable(
                new BigDecimal("50"),
                2000,
                0,
                8000,
                List.of(legendary, general)
        ));
    }

    private static Product product(QualityType tier, String price, String cost) {
        Product p = mock(Product.class);
        when(p.qualityType()).thenReturn(tier);
        when(p.price()).thenReturn(new BigDecimal(price));
        when(p.costPrice()).thenReturn(cost == null ? null : new BigDecimal(cost));
        return p;
    }
}
