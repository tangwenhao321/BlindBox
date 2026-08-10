package io.github.qifan777.server.referral.service;

import io.github.qifan777.server.referral.model.ReferralMilestonesView;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ReferralMilestonesTest {
    @Test
    void milestonesRecordHoldsTiers() {
        ReferralMilestonesView view = new ReferralMilestonesView(
                2,
                List.of(
                        new ReferralMilestonesView.MilestoneTier(1, "邀 1 人", true, 20, true),
                        new ReferralMilestonesView.MilestoneTier(3, "邀 3 人", false, 30, false)
                )
        );
        assertThat(view.invitedCount()).isEqualTo(2);
        assertThat(view.tiers()).hasSize(2);
        assertThat(view.tiers().get(0).reached()).isTrue();
    }
}
