package io.github.qifan777.server.referral.service;

import io.github.qifan777.server.referral.repository.ReferralCommissionRecordRepository;
import io.github.qifan777.server.user.root.entity.User;
import io.github.qifan777.server.user.root.repository.UserBalanceLogRepository;
import io.github.qifan777.server.user.root.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReferralServiceTest {
    @Mock
    private UserRepository userRepository;
    @Mock
    private UserBalanceLogRepository userBalanceLogRepository;
    @Mock
    private ReferralCommissionRecordRepository referralCommissionRecordRepository;

    @InjectMocks
    private ReferralService referralService;

    @Test
    void grantCommissionOnPayment_skipsWhenBuyerHasNoInviter() {
        User buyer = mock(User.class);
        when(buyer.inviterId()).thenReturn(null);
        when(userRepository.findById("buyer-1")).thenReturn(Optional.of(buyer));

        referralService.grantCommissionOnPayment("buyer-1", "order-1", new BigDecimal("100.00"));

        verify(userRepository, never()).addBalance(any(), any());
    }

    @Test
    void grantCommissionOnPayment_grantsFivePercentToInviter() {
        User buyer = mock(User.class);
        User inviter = mock(User.class);
        when(buyer.inviterId()).thenReturn("inviter-1");
        when(userRepository.findById("buyer-1")).thenReturn(Optional.of(buyer));
        when(userRepository.findById("inviter-1")).thenReturn(Optional.of(inviter));
        when(inviter.balance()).thenReturn(new BigDecimal("50.00"));

        referralService.grantCommissionOnPayment("buyer-1", "order-1", new BigDecimal("100.00"));

        verify(userRepository).addBalance(eq("inviter-1"), eq(new BigDecimal("5.00")));
    }
}
