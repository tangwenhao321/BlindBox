package io.github.qifan777.server.fragment.service;

import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.dict.model.ProductOrderStatus;
import io.github.qifan777.server.user.root.entity.User;
import io.qifan.infrastructure.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(org.mockito.junit.jupiter.MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UserFragmentServiceSurpriseBonusTest {

    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private MysteryBoxOrderRepository mysteryBoxOrderRepository;

    @InjectMocks
    private UserFragmentService userFragmentService;

    @Test
    void grantsOnceThenIdempotent() {
        stubPaidOrder("u1", "o1", ProductOrderStatus.TO_BE_DELIVERED);
        when(jdbcTemplate.update(anyString(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(1)
                .thenThrow(new DuplicateKeyException("dup"));
        when(jdbcTemplate.queryForObject(anyString(), org.mockito.ArgumentMatchers.eq(Integer.class), any()))
                .thenReturn(1);
        when(jdbcTemplate.update(anyString(), any(), any(), any())).thenReturn(1);

        Map<String, Object> first = userFragmentService.grantSurpriseEffectBonus("u1", "o1");
        Map<String, Object> second = userFragmentService.grantSurpriseEffectBonus("u1", "o1");

        assertThat(first.get("alreadyGranted")).isEqualTo(false);
        assertThat(first.get("fragments")).isEqualTo(1);
        assertThat(second.get("alreadyGranted")).isEqualTo(true);
    }

    @Test
    void rejectsUnpaidAndForeignOrders() {
        stubPaidOrder("u2", "o2", ProductOrderStatus.TO_BE_PAID);
        assertThatThrownBy(() -> userFragmentService.grantSurpriseEffectBonus("u2", "o2"))
                .isInstanceOf(BusinessException.class);

        stubPaidOrder("owner", "o3", ProductOrderStatus.TO_BE_DELIVERED);
        assertThatThrownBy(() -> userFragmentService.grantSurpriseEffectBonus("other", "o3"))
                .isInstanceOf(BusinessException.class);
    }

    private void stubPaidOrder(String userId, String orderId, ProductOrderStatus status) {
        User user = mock(User.class);
        when(user.id()).thenReturn(userId);
        MysteryBoxOrder order = mock(MysteryBoxOrder.class);
        when(order.creator()).thenReturn(user);
        when(order.status()).thenReturn(status);
        when(mysteryBoxOrderRepository.findByIdForFront(orderId)).thenReturn(order);
    }
}
