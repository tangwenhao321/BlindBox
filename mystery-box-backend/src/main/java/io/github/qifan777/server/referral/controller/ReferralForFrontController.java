package io.github.qifan777.server.referral.controller;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.referral.entity.ReferralCommissionRecord;
import io.github.qifan777.server.referral.entity.dto.ReferralCommissionRecordSpec;
import io.github.qifan777.server.referral.model.BindInviteCodeInput;
import io.github.qifan777.server.referral.model.ReferralMilestonesView;
import io.github.qifan777.server.referral.model.ReferralStatsView;
import io.github.qifan777.server.referral.model.TeamMemberView;
import io.github.qifan777.server.referral.repository.ReferralCommissionRecordRepository;
import io.github.qifan777.server.referral.service.ReferralService;
import lombok.AllArgsConstructor;
import org.babyfish.jimmer.client.FetchBy;
import org.babyfish.jimmer.client.meta.DefaultFetcherOwner;
import org.springframework.data.domain.Page;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("front/referral")
@AllArgsConstructor
@DefaultFetcherOwner(ReferralCommissionRecordRepository.class)
@Transactional
public class ReferralForFrontController {
    private final ReferralService referralService;

    @GetMapping("stats")
    public ReferralStatsView stats() {
        return referralService.getStats(StpUtil.getLoginIdAsString());
    }

    @GetMapping("milestones")
    public ReferralMilestonesView milestones() {
        return referralService.milestones(StpUtil.getLoginIdAsString());
    }

    @PostMapping("commissions/query")
    public Page<@FetchBy("COMPLEX_FETCHER_FOR_FRONT") ReferralCommissionRecord> queryCommissions(
            @RequestBody QueryRequest<ReferralCommissionRecordSpec> request) {
        return referralService.queryCommissions(StpUtil.getLoginIdAsString(), request);
    }

    @GetMapping("team")
    public List<TeamMemberView> team(@RequestParam(defaultValue = "1") int level) {
        return referralService.getTeamMembers(StpUtil.getLoginIdAsString(), level);
    }

    @PostMapping("bind")
    public Boolean bind(@RequestBody @Validated BindInviteCodeInput input) {
        referralService.bindInviteCode(StpUtil.getLoginIdAsString(), input.getInviteCode());
        return true;
    }
}
