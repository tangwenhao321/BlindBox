package io.github.qifan777.server.referral.service;

import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.referral.repository.ReferralCommissionRecordRepository;
import io.github.qifan777.server.user.root.entity.User;
import io.github.qifan777.server.user.root.repository.UserRepository;
import io.github.qifan777.server.user.root.service.UserCoinLedgerService;
import io.github.qifan777.server.user.root.service.UserWalletService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ReferralServiceTest {
    @Mock
    private UserRepository userRepository;
    @Mock
    private UserWalletService userWalletService;
    @Mock
    private UserCoinLedgerService userCoinLedgerService;
    @Mock
    private ReferralCommissionRecordRepository referralCommissionRecordRepository;
    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private MarketProperties marketProperties;

    @InjectMocks
    private ReferralService referralService;

    @BeforeEach
    void setUp() {
        when(marketProperties.getCurrency()).thenReturn("CNY");
    }

    @Test
    void grantCommissionOnPayment_skipsWhenBuyerHasNoInviter() {
        User buyer = mock(User.class);
        when(buyer.inviterId()).thenReturn(null);
        when(userRepository.findById("buyer-1")).thenReturn(Optional.of(buyer));

        referralService.grantCommissionOnPayment("buyer-1", "order-1", new BigDecimal("100.00"));

        verify(userWalletService, never()).credit(anyString(), any(), anyString(), anyString(), anyString());
    }

    @Test
    void grantCommissionOnPayment_grantsConfiguredRateToInviter() {
        ReflectionTestUtils.setField(referralService, "commissionRate", new BigDecimal("0.05"));
        User buyer = mock(User.class);
        when(buyer.inviterId()).thenReturn("inviter-1");
        when(userRepository.findById("buyer-1")).thenReturn(Optional.of(buyer));

        referralService.grantCommissionOnPayment("buyer-1", "order-1", new BigDecimal("100.00"));

        verify(userWalletService).credit(
                eq("inviter-1"),
                eq(new BigDecimal("5.00")),
                eq("REFERRAL_COMMISSION"),
                eq("邀请佣金"),
                eq("order-1")
        );
        verify(referralCommissionRecordRepository).save(any(io.github.qifan777.server.referral.entity.ReferralCommissionRecord.class));
    }

    @Test
    void grantCommissionOnPayment_vndRoundsToWholeUnits() {
        when(marketProperties.getCurrency()).thenReturn("VND");
        ReflectionTestUtils.setField(referralService, "commissionRate", new BigDecimal("0.05"));
        User buyer = mock(User.class);
        when(buyer.inviterId()).thenReturn("inviter-1");
        when(userRepository.findById("buyer-1")).thenReturn(Optional.of(buyer));

        referralService.grantCommissionOnPayment("buyer-1", "order-1", new BigDecimal("100"));

        verify(userWalletService).credit(
                eq("inviter-1"),
                eq(new BigDecimal("5")),
                eq("REFERRAL_COMMISSION"),
                eq("邀请佣金"),
                eq("order-1")
        );
    }
}
