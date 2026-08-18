package io.github.qifan777.server.box.pity.service;

import io.github.qifan777.server.box.root.entity.MysteryBox;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.notification.service.UserNotificationService;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.user.root.service.UserWalletService;
import io.qifan.infrastructure.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MysteryBoxUserPityServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private MysteryBoxRepository mysteryBoxRepository;
    @Mock
    private UserWalletService userWalletService;
    @Mock
    private UserNotificationService userNotificationService;
    @Mock
    private MarketProperties marketProperties;

    private MysteryBoxUserPityService service;

    @BeforeEach
    void setUp() {
        service = new MysteryBoxUserPityService(
                jdbcTemplate, mysteryBoxRepository, userWalletService, userNotificationService, marketProperties);
        ReflectionTestUtils.setField(service, "compensatePoints", BigDecimal.valueOf(100));
        ReflectionTestUtils.setField(service, "compensatePointsRate", BigDecimal.ZERO);
        ReflectionTestUtils.setField(service, "priceThresholdsConfig", "");
        lenient().when(marketProperties.getCurrency()).thenReturn("CNY");
    }

    @Test
    void compensate_rejectsPointsWithoutPending() {
        stubBox();
        stubEnsureRowExists();
        stubCompensateStatus(null);

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> service.compensate("user-1", "box-1", "POINTS")
        );
        assertThat(ex.getMessage()).contains("当前不可领取积分补偿");
        verify(userWalletService, never()).credit(anyString(), any(), anyString(), anyString(), anyString());
    }

    @Test
    void compensate_rejectsPointsWhenNoneOrDone() {
        stubBox();
        stubEnsureRowExists();
        stubCompensateStatus("NONE");
        assertThrows(BusinessException.class, () -> service.compensate("user-1", "box-1", "POINTS"));

        stubCompensateStatus("DONE");
        assertThrows(BusinessException.class, () -> service.compensate("user-1", "box-1", "POINTS"));

        stubCompensateStatus("POINTS");
        assertThrows(BusinessException.class, () -> service.compensate("user-1", "box-1", "POINTS"));
        verify(userWalletService, never()).credit(anyString(), any(), anyString(), anyString(), anyString());
    }

    @Test
    void compensate_allowsPointsWhenPending() {
        stubBox();
        stubEnsureRowExists();
        stubCompensateStatus("PENDING");
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);

        MysteryBoxUserPityService.PityCompensateView view =
                service.compensate("user-1", "box-1", "POINTS");

        assertThat(view.choice()).isEqualTo("POINTS");
        assertThat(view.pointsGranted()).isEqualByComparingTo("100");
        verify(userWalletService).credit(
                eq("user-1"),
                eq(BigDecimal.valueOf(100)),
                eq("PITY_COMPENSATE"),
                anyString(),
                eq("box-1")
        );
    }

    @Test
    void compensate_allowsPointsUpgradeFromWait() {
        stubBox();
        stubEnsureRowExists();
        stubCompensateStatus("WAIT");
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);

        MysteryBoxUserPityService.PityCompensateView view =
                service.compensate("user-1", "box-1", "POINTS");

        assertThat(view.choice()).isEqualTo("POINTS");
        verify(userWalletService).credit(eq("user-1"), any(), eq("PITY_COMPENSATE"), anyString(), eq("box-1"));
    }

    @Test
    void compensate_waitOnlyFromPending() {
        stubBox();
        stubEnsureRowExists();
        stubCompensateStatus("WAIT");

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> service.compensate("user-1", "box-1", "WAIT")
        );
        assertThat(ex.getMessage()).contains("仅待处理补偿可登记等待补货");
    }

    @Test
    void compensate_allowsWaitFromPending() {
        stubBox();
        stubEnsureRowExists();
        stubCompensateStatus("PENDING");
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);

        MysteryBoxUserPityService.PityCompensateView view =
                service.compensate("user-1", "box-1", "WAIT");

        assertThat(view.choice()).isEqualTo("WAIT");
        assertThat(view.pointsGranted()).isEqualByComparingTo(BigDecimal.ZERO);
        verify(userWalletService, never()).credit(anyString(), any(), anyString(), anyString(), anyString());
    }

    @Test
    void clearCompensateWaitOnRestock_notifiesWaitingUsers() {
        when(jdbcTemplate.queryForList(
                anyString(),
                eq(String.class),
                eq("box-1")
        )).thenReturn(List.of("user-1", "user-2"));
        when(jdbcTemplate.update(anyString(), any(), eq("box-1"))).thenReturn(2);

        service.clearCompensateWaitOnRestock("box-1");

        verify(userNotificationService).pushBulk(
                eq(List.of("user-1", "user-2")),
                eq("RESTOCK"),
                eq("高阶赏已补货"),
                eq("可继续抽取保底奖励"),
                eq("box-1")
        );
    }

    @Test
    void clearCompensateWaitOnRestock_skipsPushWhenNoWaiters() {
        when(jdbcTemplate.queryForList(
                anyString(),
                eq(String.class),
                eq("box-1")
        )).thenReturn(List.of());
        when(jdbcTemplate.update(anyString(), any(), eq("box-1"))).thenReturn(0);

        service.clearCompensateWaitOnRestock("box-1");

        verify(userNotificationService, never()).pushBulk(any(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void resolveCompensatePoints_scalesByBoxPriceWhenRateSet() {
        ReflectionTestUtils.setField(service, "compensatePoints", BigDecimal.valueOf(100));
        ReflectionTestUtils.setField(service, "compensatePointsRate", new BigDecimal("0.1"));
        MysteryBox box = stubBox();
        when(box.price()).thenReturn(new BigDecimal("2000"));

        assertThat(service.resolveCompensatePoints(box)).isEqualByComparingTo("200");
    }

    @Test
    void resolveCompensatePoints_keepsFloorWhenPriceScaledLower() {
        ReflectionTestUtils.setField(service, "compensatePoints", BigDecimal.valueOf(100));
        ReflectionTestUtils.setField(service, "compensatePointsRate", new BigDecimal("0.1"));
        MysteryBox box = stubBox();
        when(box.price()).thenReturn(new BigDecimal("50"));

        assertThat(service.resolveCompensatePoints(box)).isEqualByComparingTo("100");
    }

    @Test
    void shouldForceHigh_whenDrawsMeetThreshold() {
        MysteryBox box = stubBox();
        when(box.pityThreshold()).thenReturn(50);
        when(jdbcTemplate.queryForList(
                eq("SELECT draws_since_high FROM mystery_box_user_pity WHERE user_id = ? AND mystery_box_id = ? LIMIT 1"),
                eq("user-1"),
                eq("box-1")
        )).thenReturn(List.of(Map.of("draws_since_high", 50)));
        when(jdbcTemplate.queryForList(
                eq("SELECT compensate_status FROM mystery_box_user_pity WHERE user_id = ? AND mystery_box_id = ? LIMIT 1"),
                eq("user-1"),
                eq("box-1")
        )).thenReturn(List.of());

        assertThat(service.shouldForceHigh("user-1", "box-1")).isTrue();
    }

    @Test
    void shouldForceHigh_onTheDrawThatReachesThreshold() {
        MysteryBox box = stubBox();
        when(box.pityThreshold()).thenReturn(50);
        when(jdbcTemplate.queryForList(
                eq("SELECT draws_since_high FROM mystery_box_user_pity WHERE user_id = ? AND mystery_box_id = ? LIMIT 1"),
                eq("user-1"),
                eq("box-1")
        )).thenReturn(List.of(Map.of("draws_since_high", 49)));
        when(jdbcTemplate.queryForList(
                eq("SELECT compensate_status FROM mystery_box_user_pity WHERE user_id = ? AND mystery_box_id = ? LIMIT 1"),
                eq("user-1"),
                eq("box-1")
        )).thenReturn(List.of());

        assertThat(service.shouldForceHigh("user-1", "box-1")).isTrue();
        assertThat(service.shouldForceHigh("user-1", "box-1", 1)).isTrue();
    }

    @Test
    void shouldForceHigh_whenBatchWillCrossThreshold() {
        MysteryBox box = stubBox();
        when(box.pityThreshold()).thenReturn(50);
        when(jdbcTemplate.queryForList(
                eq("SELECT draws_since_high FROM mystery_box_user_pity WHERE user_id = ? AND mystery_box_id = ? LIMIT 1"),
                eq("user-1"),
                eq("box-1")
        )).thenReturn(List.of(Map.of("draws_since_high", 0)));
        when(jdbcTemplate.queryForList(
                eq("SELECT compensate_status FROM mystery_box_user_pity WHERE user_id = ? AND mystery_box_id = ? LIMIT 1"),
                eq("user-1"),
                eq("box-1")
        )).thenReturn(List.of());

        assertThat(service.shouldForceHigh("user-1", "box-1", 50)).isTrue();
        assertThat(service.shouldForceHigh("user-1", "box-1", 49)).isFalse();
        assertThat(service.shouldForceHigh("user-1", "box-1")).isFalse();
    }

    @Test
    void shouldForceHigh_falseWhenBelowThresholdOrZeroThreshold() {
        MysteryBox box = stubBox();
        when(box.pityThreshold()).thenReturn(50);
        when(jdbcTemplate.queryForList(
                eq("SELECT draws_since_high FROM mystery_box_user_pity WHERE user_id = ? AND mystery_box_id = ? LIMIT 1"),
                eq("user-1"),
                eq("box-1")
        )).thenReturn(List.of(Map.of("draws_since_high", 10)));
        when(jdbcTemplate.queryForList(
                eq("SELECT compensate_status FROM mystery_box_user_pity WHERE user_id = ? AND mystery_box_id = ? LIMIT 1"),
                eq("user-1"),
                eq("box-1")
        )).thenReturn(List.of());
        assertThat(service.shouldForceHigh("user-1", "box-1")).isFalse();

        when(box.pityThreshold()).thenReturn(0);
        ReflectionTestUtils.setField(service, "priceThresholdsConfig", "");
        // resolveThreshold falls back to 50 when pityThreshold is 0 and no price tiers
        when(jdbcTemplate.queryForList(
                eq("SELECT draws_since_high FROM mystery_box_user_pity WHERE user_id = ? AND mystery_box_id = ? LIMIT 1"),
                eq("user-1"),
                eq("box-1")
        )).thenReturn(List.of(Map.of("draws_since_high", 0)));
        assertThat(service.shouldForceHigh("user-1", "box-1")).isFalse();
    }

    private MysteryBox stubBox() {
        MysteryBox box = org.mockito.Mockito.mock(MysteryBox.class);
        org.mockito.Mockito.lenient().when(mysteryBoxRepository.findById("box-1")).thenReturn(Optional.of(box));
        org.mockito.Mockito.lenient().when(box.price()).thenReturn(BigDecimal.TEN);
        return box;
    }

    private void stubEnsureRowExists() {
        org.mockito.Mockito.lenient().when(jdbcTemplate.queryForObject(
                eq("SELECT COUNT(1) FROM mystery_box_user_pity WHERE user_id = ? AND mystery_box_id = ?"),
                eq(Integer.class),
                eq("user-1"),
                eq("box-1")
        )).thenReturn(1);
    }

    private void stubCompensateStatus(String status) {
        if (status == null) {
            when(jdbcTemplate.queryForList(
                    eq("SELECT compensate_status FROM mystery_box_user_pity WHERE user_id = ? AND mystery_box_id = ? LIMIT 1"),
                    eq("user-1"),
                    eq("box-1")
            )).thenReturn(List.of());
            return;
        }
        when(jdbcTemplate.queryForList(
                eq("SELECT compensate_status FROM mystery_box_user_pity WHERE user_id = ? AND mystery_box_id = ? LIMIT 1"),
                eq("user-1"),
                eq("box-1")
        )).thenReturn(List.of(Map.of("compensate_status", status)));
    }
}
