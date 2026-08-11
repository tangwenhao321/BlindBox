package io.github.qifan777.server.teamlottery;

import io.qifan.infrastructure.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TeamLotteryServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    private TeamLotteryService service;

    @BeforeEach
    void setUp() {
        service = new TeamLotteryService(jdbcTemplate);
    }

    @Test
    void quotaIsMembersUntilLockedOrFull() {
        assertEquals(1, TeamLotteryService.computeQuota(1, false));
        assertEquals(2, TeamLotteryService.computeQuota(2, false));
        assertEquals(4, TeamLotteryService.computeQuota(4, false));
    }

    @Test
    void quotaAddsBonusOnlyWhenLockedOrMembersAtLeastFive() {
        assertEquals(4, TeamLotteryService.computeQuota(2, true));
        assertEquals(7, TeamLotteryService.computeQuota(5, false));
        assertEquals(7, TeamLotteryService.computeQuota(5, true));
        assertEquals(7, TeamLotteryService.computeQuota(9, false));
    }

    @Test
    void isPaidOrder_rejectsToBePaidEvenWithPayTime() {
        assertFalse(TeamLotteryService.isPaidOrder("TO_BE_PAID", LocalDateTime.now()));
        assertFalse(TeamLotteryService.isPaidOrder("TO_BE_PAID", null));
        assertFalse(TeamLotteryService.isPaidOrder("CLOSED", LocalDateTime.now()));
        assertFalse(TeamLotteryService.isPaidOrder("REFUNDED", null));
    }

    @Test
    void isPaidOrder_acceptsPayTimeOrPostPaymentStatus() {
        assertTrue(TeamLotteryService.isPaidOrder("TO_BE_DELIVERED", LocalDateTime.now()));
        assertTrue(TeamLotteryService.isPaidOrder("TO_BE_DELIVERED", null));
        assertTrue(TeamLotteryService.isPaidOrder("FINISHED", null));
        assertTrue(TeamLotteryService.isPaidOrder("TO_BE_RECEIVED", LocalDateTime.now()));
    }

    @Test
    void productsJsonContainsHidden_detectsServerPrizeTier() {
        assertTrue(TeamLotteryService.productsJsonContainsHidden("[{\"name\":\"x\",\"qualityType\":\"HIDDEN\"}]"));
        assertTrue(TeamLotteryService.productsJsonContainsHidden(
                "[{\"qualityType\":{\"keyId\":1,\"keyEnName\":\"HIDDEN\"}}]"));
        assertFalse(TeamLotteryService.productsJsonContainsHidden("[{\"qualityType\":\"GENERAL\"}]"));
        assertFalse(TeamLotteryService.productsJsonContainsHidden(null));
        assertFalse(TeamLotteryService.productsJsonContainsHidden(""));
    }

    @Test
    void consumeDraw_rejectsBlankOrderIdWithoutConsumingQuota() {
        stubActiveMember("user-1", "team-1");

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> service.consumeDraw("user-1", "team-1", "  ", null)
        );
        assertTrue(ex.getMessage().contains("下单"));
        verify(jdbcTemplate, never()).update(contains("draws_used = draws_used + 1"), eq("team-1"));
    }

    @Test
    void consumeDraw_rejectsUnpaidOrderWithoutConsumingQuota() {
        stubActiveMember("user-1", "team-1");
        when(jdbcTemplate.queryForMap(contains("draw_quota"), eq("team-1")))
                .thenReturn(Map.of(
                        "status", "LOCKED",
                        "draw_quota", 2,
                        "draws_used", 0,
                        "box_id", "box-1"
                ));
        Map<String, Object> unpaid = new HashMap<>();
        unpaid.put("creator_id", "user-1");
        unpaid.put("order_status", "TO_BE_PAID");
        unpaid.put("pay_time", null);
        unpaid.put("mystery_box_id", "box-1");
        when(jdbcTemplate.queryForList(contains("mystery_box_order"), eq("order-unpaid")))
                .thenReturn(List.of(unpaid));

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> service.consumeDraw("user-1", "team-1", "order-unpaid", null)
        );
        assertTrue(ex.getMessage().contains("支付"));
        verify(jdbcTemplate, never()).update(contains("draws_used = draws_used + 1"), eq("team-1"));
    }

    @Test
    void consumeDraw_computesHitHiddenFromOrderPrizesIgnoringClient() {
        stubActiveMember("user-1", "team-1");
        when(jdbcTemplate.queryForMap(contains("draw_quota"), eq("team-1")))
                .thenReturn(Map.of(
                        "status", "LOCKED",
                        "draw_quota", 3,
                        "draws_used", 1,
                        "box_id", "box-1"
                ));
        when(jdbcTemplate.queryForList(contains("mystery_box_order"), eq("order-paid")))
                .thenReturn(List.of(Map.of(
                        "creator_id", "user-1",
                        "order_status", "TO_BE_DELIVERED",
                        "pay_time", Timestamp.valueOf(LocalDateTime.now()),
                        "mystery_box_id", "box-1"
                )));
        when(jdbcTemplate.query(
                contains("SELECT products"),
                ArgumentMatchers.<RowMapper<String>>any(),
                eq("order-paid")
        )).thenReturn(List.of("[{\"id\":\"p1\",\"qualityType\":\"HIDDEN\"}]"));
        when(jdbcTemplate.update(anyString(), ArgumentMatchers.<Object[]>any())).thenReturn(1);
        when(jdbcTemplate.queryForList(contains("team_lottery_member"), eq(String.class), eq("team-1")))
                .thenReturn(List.of("user-1"));

        TeamLotteryService.DrawResult result =
                service.consumeDraw("user-1", "team-1", "order-paid", "{\"clientHitHidden\":false}");

        assertTrue(result.grantedBoost());
        assertEquals(1, result.remainingQuota());
        verify(jdbcTemplate).update(contains("draws_used = draws_used + 1"), eq("team-1"));
    }

    private void stubActiveMember(String userId, String teamId) {
        when(jdbcTemplate.queryForObject(
                contains("team_lottery_member"),
                eq(Integer.class),
                eq(teamId),
                eq(userId)
        )).thenReturn(1);
    }
}
