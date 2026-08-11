package io.github.qifan777.server.user.root.service;

import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.user.root.entity.User;
import io.github.qifan777.server.user.root.entity.UserBalanceLog;
import io.github.qifan777.server.user.root.repository.UserBalanceLogRepository;
import io.github.qifan777.server.user.root.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserWalletServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private UserBalanceLogRepository userBalanceLogRepository;
    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private MarketProperties marketProperties;

    @InjectMocks
    private UserWalletService userWalletService;

    @BeforeEach
    void setUp() {
        lenient().when(marketProperties.getCurrency()).thenReturn("CNY");
    }

    @Test
    void credit_isIdempotent_whenSameRefIdAndChangeType() {
        User user = mock(User.class);
        when(user.balance()).thenReturn(new BigDecimal("10.00"));
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(jdbcTemplate.update(anyString(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(1)
                .thenThrow(new DuplicateKeyException("dup"));
        when(jdbcTemplate.update(anyString(), any(), any(), any())).thenReturn(1);

        userWalletService.credit("u1", new BigDecimal("5.00"), "REFUND", "退款", "order-1");
        userWalletService.credit("u1", new BigDecimal("5.00"), "REFUND", "退款", "order-1");

        verify(userRepository, times(1)).addBalance(eq("u1"), eq(new BigDecimal("5.00")));
    }

    @Test
    void credit_withoutRefId_alwaysWrites() {
        User user = mock(User.class);
        when(user.balance()).thenReturn(new BigDecimal("1.00"));
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));

        userWalletService.credit("u1", new BigDecimal("2.00"), "MANUAL", "手工", null);
        userWalletService.credit("u1", new BigDecimal("2.00"), "MANUAL", "手工", "  ");

        verify(userRepository, times(2)).addBalance(eq("u1"), eq(new BigDecimal("2.00")));
        verify(userBalanceLogRepository, times(2)).save(any(UserBalanceLog.class));
        verify(jdbcTemplate, never()).update(anyString(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void deduct_isIdempotent_whenSameRefIdAndChangeType() {
        when(jdbcTemplate.update(anyString(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenThrow(new DuplicateKeyException("dup"));

        userWalletService.deduct("u1", new BigDecimal("9.00"), "MARKETPLACE_HOLD", "锁定", "trade-1");

        verify(userRepository, never()).sql();
        verify(userBalanceLogRepository, never()).save(any(UserBalanceLog.class));
    }

    @Test
    void reconcileBalanceVsLogs_comparesSignedSumToBalance() {
        User user = mock(User.class);
        when(user.balance()).thenReturn(new BigDecimal("15.00"));
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));

        UserBalanceLog credit = mock(UserBalanceLog.class);
        when(credit.changeType()).thenReturn("REFUND");
        when(credit.amount()).thenReturn(new BigDecimal("20.00"));
        when(credit.balanceAfter()).thenReturn(new BigDecimal("20.00"));

        UserBalanceLog debit = mock(UserBalanceLog.class);
        when(debit.changeType()).thenReturn("WAREHOUSE_SHIP");
        when(debit.amount()).thenReturn(new BigDecimal("5.00"));
        when(debit.balanceAfter()).thenReturn(new BigDecimal("15.00"));

        when(userBalanceLogRepository.findAllByUserOrdered("u1")).thenReturn(List.of(credit, debit));

        UserWalletService.WalletReconcileResult result = userWalletService.reconcileBalanceVsLogs("u1");

        assertThat(result.matched()).isTrue();
        assertThat(result.ledgerSignedSum()).isEqualByComparingTo("15.00");
        assertThat(result.latestBalanceAfter()).isEqualByComparingTo("15.00");
    }

    @Test
    void credit_persistsAbsoluteAmountAndRef() {
        User user = mock(User.class);
        when(user.balance()).thenReturn(new BigDecimal("7.00"));
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(jdbcTemplate.update(anyString(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(1);
        when(jdbcTemplate.update(anyString(), any(), any(), any())).thenReturn(1);

        userWalletService.credit("u1", new BigDecimal("3.50"), "REDEEM_ORDER", "兑换", "ord-1");

        verify(userRepository).addBalance(eq("u1"), eq(new BigDecimal("3.50")));
        verify(jdbcTemplate, times(1)).update(
                anyString(),
                any(),
                eq("u1"),
                eq("REDEEM_ORDER"),
                eq(new BigDecimal("3.50")),
                any(),
                eq("ord-1"),
                any(),
                any(),
                any()
        );
    }
}
