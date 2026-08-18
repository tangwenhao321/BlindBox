package io.github.qifan777.server.reveal.theme;

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
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.sql.ResultSet;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RevealThemeProgressServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private MysteryBoxOrderRepository mysteryBoxOrderRepository;

    @InjectMocks
    private RevealThemeProgressService service;

    @Test
    void getMergesOrderCountWithStoredFlags() throws Exception {
        stubStored(12, 0, 1, "asmr");
        when(jdbcTemplate.queryForObject(contains("SELECT COUNT(*)"), eq(Integer.class), eq("u1")))
                .thenReturn(50);
        when(jdbcTemplate.queryForObject(contains("EXISTS"), eq(Integer.class), eq("u1")))
                .thenReturn(1);
        when(jdbcTemplate.queryForObject(contains("completed"), eq(Integer.class), eq("u1")))
                .thenReturn(0);
        when(jdbcTemplate.update(anyString(), any(), any(), any(), any(), any())).thenReturn(1);

        RevealThemeProgressView view = service.get("u1");
        assertThat(view.openCount()).isEqualTo(50);
        assertThat(view.hasHidden()).isTrue();
        assertThat(view.seriesComplete()).isTrue();
        assertThat(view.equippedThemeId()).isEqualTo("asmr");
        assertThat(RevealThemeProgressService.unlockedKeys(view.openCount(), view.hasHidden(), view.seriesComplete()))
                .contains("cyberpunk", "party", "adventure");
    }

    @Test
    void recordOpenIsIdempotentPerOrder() throws Exception {
        stubPaidOrder("u1", "o1", ProductOrderStatus.TO_BE_DELIVERED);
        when(jdbcTemplate.update(contains("user_reveal_theme_open"), eq("u1"), eq("o1")))
                .thenReturn(1)
                .thenThrow(new DuplicateKeyException("dup"));
        stubStored(1, 1, 0, null);
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq("u1"))).thenReturn(1);
        when(jdbcTemplate.update(anyString(), any(), any(), any(), any(), any())).thenReturn(1);

        RevealThemeProgressView first = service.recordOpen("u1", "o1", true, false);
        RevealThemeProgressView second = service.recordOpen("u1", "o1", true, false);
        assertThat(first.hasHidden()).isTrue();
        assertThat(second.hasHidden()).isTrue();
    }

    @Test
    void rejectsUnpaidAndForeignOrders() {
        stubPaidOrder("u2", "o2", ProductOrderStatus.TO_BE_PAID);
        assertThatThrownBy(() -> service.recordOpen("u2", "o2", false, false))
                .isInstanceOf(BusinessException.class);

        stubPaidOrder("owner", "o3", ProductOrderStatus.TO_BE_DELIVERED);
        assertThatThrownBy(() -> service.recordOpen("other", "o3", false, false))
                .isInstanceOf(BusinessException.class);
    }

    @SuppressWarnings("unchecked")
    private void stubStored(int openCount, int hidden, int series, String equipped) throws Exception {
        when(jdbcTemplate.query(contains("user_reveal_theme_progress"), any(RowMapper.class), eq("u1")))
                .thenAnswer(invocation -> {
                    RowMapper<Object> mapper = invocation.getArgument(1);
                    ResultSet rs = mock(ResultSet.class);
                    when(rs.getInt("open_count")).thenReturn(openCount);
                    when(rs.getInt("has_hidden")).thenReturn(hidden);
                    when(rs.getInt("series_complete")).thenReturn(series);
                    when(rs.getString("equipped_theme_id")).thenReturn(equipped);
                    return List.of(mapper.mapRow(rs, 0));
                });
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
