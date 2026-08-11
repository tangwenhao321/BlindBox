package io.github.qifan777.server.teamlottery;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TeamLotteryRulesTest {

    @Test
    void quotaEqualsMembersUntilFull() {
        assertThat(TeamLotteryRules.calculateDrawQuota(1, false)).isEqualTo(1);
        assertThat(TeamLotteryRules.calculateDrawQuota(3, false)).isEqualTo(3);
        assertThat(TeamLotteryRules.calculateDrawQuota(4, false)).isEqualTo(4);
    }

    @Test
    void quotaAddsBonusWhenFullOrLocked() {
        assertThat(TeamLotteryRules.calculateDrawQuota(5, false)).isEqualTo(7);
        assertThat(TeamLotteryRules.calculateDrawQuota(3, true)).isEqualTo(5);
        assertThat(TeamLotteryRules.calculateDrawQuota(5, true)).isEqualTo(7);
    }

    @Test
    void antiCheatRejectsSharedDeviceIpOrPhone() {
        assertThat(TeamLotteryRules.conflictsWithActiveMembership(true, false, false)).isTrue();
        assertThat(TeamLotteryRules.conflictsWithActiveMembership(false, true, false)).isTrue();
        assertThat(TeamLotteryRules.conflictsWithActiveMembership(false, false, true)).isTrue();
        assertThat(TeamLotteryRules.conflictsWithActiveMembership(false, false, false)).isFalse();
    }

    @Test
    void isFullAtMaxMembers() {
        assertThat(TeamLotteryRules.isFull(4)).isFalse();
        assertThat(TeamLotteryRules.isFull(5)).isTrue();
    }
}
