package io.github.qifan777.server.box.draw;

import io.github.qifan777.server.box.order.config.RedeemProperties;
import io.github.qifan777.server.dict.model.QualityType;
import io.github.qifan777.server.product.root.entity.Product;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PrizeExitLiabilityTest {

    @Test
    void liabilityTakesMaxOfCogsWalletAndFragments() {
        RedeemProperties redeem = new RedeemProperties();
        redeem.setBalanceRate(new BigDecimal("0.35"));
        Product product = mock(Product.class);
        when(product.qualityType()).thenReturn(QualityType.LEGENDARY);
        when(product.price()).thenReturn(new BigDecimal("1000"));
        when(product.costPrice()).thenReturn(new BigDecimal("10"));

        BigDecimal cogs = PrizeExitLiability.cogs(product);
        BigDecimal wallet = PrizeExitLiability.redeemToWallet(product, redeem, "CNY");
        int frags = PrizeExitLiability.decomposeFragments(QualityType.LEGENDARY, new BigDecimal("1000"), "CNY");
        BigDecimal unit = new BigDecimal("5");
        BigDecimal liab = PrizeExitLiability.liability(product, redeem, "CNY", unit);

        assertEquals(new BigDecimal("10"), cogs);
        assertEquals(0, new BigDecimal("350").compareTo(wallet));
        assertTrue(frags >= 50);
        assertEquals(0, wallet.max(unit.multiply(BigDecimal.valueOf(frags))).max(cogs).compareTo(liab));
    }

    @Test
    void hiddenDecomposeIsAtLeast25() {
        assertEquals(25, PrizeExitLiability.decomposeFragments(QualityType.HIDDEN, null, "CNY"));
        assertEquals(50, PrizeExitLiability.decomposeFragments(QualityType.LEGENDARY, null, "CNY"));
        assertEquals(8, PrizeExitLiability.decomposeFragments(QualityType.GENERAL, null, "CNY"));
    }
}
