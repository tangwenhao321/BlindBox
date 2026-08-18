package io.github.qifan777.server.box.root.service;

import io.github.qifan777.server.box.draw.BoxExpectedValueGuard;
import io.github.qifan777.server.box.draw.PrizeExitValuationService;
import io.github.qifan777.server.box.product.service.PrizeStockService;
import io.github.qifan777.server.box.root.entity.MysteryBox;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.product.root.entity.Product;
import io.github.qifan777.server.referral.service.ReferralService;
import io.github.qifan777.server.risk.service.RiskControlService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NewcomerBoxServiceTest {
    @Mock
    private MysteryBoxRepository mysteryBoxRepository;
    @Mock
    private ReferralService referralService;
    @Mock
    private PrizeStockService prizeStockService;
    @Mock
    private BoxExpectedValueGuard boxExpectedValueGuard;
    @Mock
    private PrizeExitValuationService prizeExitValuationService;
    @Mock
    private RiskControlService riskControlService;
    @Mock
    private MarketProperties marketProperties;

    @InjectMocks
    private NewcomerBoxService newcomerBoxService;

    @BeforeEach
    void setUp() {
        lenient().when(marketProperties.getCurrency()).thenReturn("CNY");
        lenient().when(marketProperties.isVndMarket()).thenReturn(false);
        lenient().when(riskControlService.linkedDevicesHaveOtherPaidUsers(org.mockito.ArgumentMatchers.anyString()))
                .thenReturn(false);
    }

    @Test
    void assertCanPurchase_allowsRegularBox() {
        MysteryBox box = mock(MysteryBox.class);
        when(mysteryBoxRepository.findById("box-1")).thenReturn(Optional.of(box));

        assertDoesNotThrow(() -> newcomerBoxService.assertCanPurchase("user-1", "box-1"));
    }

    @Test
    void assertCanPurchase_allowsNonNewcomerForExclusiveBox() {
        MysteryBox box = mock(MysteryBox.class);
        when(mysteryBoxRepository.findById("box-new")).thenReturn(Optional.of(box));

        assertDoesNotThrow(() -> newcomerBoxService.assertCanPurchase("user-1", "box-new"));
    }

    @Test
    void resolveLineProductAmount_appliesFirstDrawPriceForNewcomer() {
        MysteryBox box = exclusiveNewcomerBox();
        stubEvWithinBudget(box);
        when(referralService.isNewcomer("user-1")).thenReturn(true);

        BigDecimal amount = newcomerBoxService.resolveLineProductAmount(
                "user-1",
                box,
                1,
                BigDecimal.TEN
        );
        assertEquals(0, NewcomerBoxService.NEWCOMER_FIRST_DRAW_PRICE.compareTo(amount));
    }

    @Test
    void resolveLineProductAmount_usesNormalPriceWhenEvOverBudget() {
        MysteryBox box = exclusiveNewcomerBox();
        when(referralService.isNewcomer("user-1")).thenReturn(true);
        when(box.products()).thenReturn(List.of(mock(Product.class)));
        when(box.legendaryRate()).thenReturn(100);
        when(box.hiddenRate()).thenReturn(900);
        when(box.generalRate()).thenReturn(9000);
        when(boxExpectedValueGuard.expectedPrizeValue(anyInt(), anyInt(), anyInt(), anyList()))
                .thenReturn(new BigDecimal("999"));

        assertEquals(
                BigDecimal.TEN,
                newcomerBoxService.resolveLineProductAmount("user-1", box, 1, BigDecimal.TEN)
        );
    }

    @Test
    void resolveLineProductAmount_usesNormalPriceWhenNotNewcomer() {
        MysteryBox box = mock(MysteryBox.class);
        when(box.newcomerExclusive()).thenReturn(true);
        when(referralService.isNewcomer("user-1")).thenReturn(false);

        assertEquals(
                BigDecimal.TEN,
                newcomerBoxService.resolveLineProductAmount("user-1", box, 1, BigDecimal.TEN)
        );
    }

    @Test
    void qualifiesForNewcomerFirstDrawPrice_requiresSingleDraw() {
        MysteryBox box = exclusiveNewcomerBox();
        stubEvWithinBudget(box);
        when(referralService.isNewcomer("user-1")).thenReturn(true);

        assertTrue(newcomerBoxService.qualifiesForNewcomerFirstDrawPrice("user-1", box, 1));
        assertFalse(newcomerBoxService.qualifiesForNewcomerFirstDrawPrice("user-1", box, 5));
    }

    private static MysteryBox exclusiveNewcomerBox() {
        MysteryBox box = mock(MysteryBox.class);
        when(box.newcomerExclusive()).thenReturn(true);
        return box;
    }

    private void stubEvWithinBudget(MysteryBox box) {
        when(box.products()).thenReturn(List.of(mock(Product.class)));
        when(box.legendaryRate()).thenReturn(100);
        when(box.hiddenRate()).thenReturn(900);
        when(box.generalRate()).thenReturn(9000);
        when(boxExpectedValueGuard.expectedPrizeValue(anyInt(), anyInt(), anyInt(), anyList()))
                .thenReturn(new BigDecimal("10"));
    }
}
