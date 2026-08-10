package io.github.qifan777.server.box.root.service;

import io.github.qifan777.server.box.root.entity.MysteryBox;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.referral.service.ReferralService;
import io.qifan.infrastructure.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NewcomerBoxServiceTest {
    @Mock
    private MysteryBoxRepository mysteryBoxRepository;
    @Mock
    private ReferralService referralService;

    @InjectMocks
    private NewcomerBoxService newcomerBoxService;

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
        MysteryBox box = mock(MysteryBox.class);
        when(box.newcomerExclusive()).thenReturn(true);
        when(referralService.isNewcomer("user-1")).thenReturn(true);

        BigDecimal amount = newcomerBoxService.resolveLineProductAmount(
                "user-1",
                box,
                1,
                BigDecimal.TEN
        );
        assertEquals(NewcomerBoxService.NEWCOMER_FIRST_DRAW_PRICE, amount);
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
        MysteryBox box = mock(MysteryBox.class);
        when(box.newcomerExclusive()).thenReturn(true);
        when(referralService.isNewcomer("user-1")).thenReturn(true);

        assertTrue(newcomerBoxService.qualifiesForNewcomerFirstDrawPrice("user-1", box, 1));
        assertFalse(newcomerBoxService.qualifiesForNewcomerFirstDrawPrice("user-1", box, 5));
    }
}
