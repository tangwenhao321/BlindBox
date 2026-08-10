package io.github.qifan777.server.user.compliance;

import cn.dev33.satoken.stp.StpUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("front/user/compliance")
@RequiredArgsConstructor
public class UserComplianceForFrontController {
    private final UserComplianceService userComplianceService;
    private final UserSpendLimitService userSpendLimitService;

    @GetMapping("age")
    public Map<String, Boolean> ageStatus() {
        String userId = StpUtil.getLoginIdAsString();
        return Map.of("confirmed", userComplianceService.isAgeConfirmed(userId));
    }

    @PostMapping("confirm-age")
    public void confirmAge() {
        userComplianceService.confirmAge(StpUtil.getLoginIdAsString());
    }

    @GetMapping("spend-limit")
    public UserSpendLimitService.SpendLimitView spendLimit() {
        return userSpendLimitService.check(StpUtil.getLoginIdAsString());
    }

    @PostMapping("spend-limit/preference")
    public UserSpendLimitService.SpendLimitView updateSpendLimitPreference(@RequestBody UpdateSpendLimitRequest body) {
        return userSpendLimitService.updateUserPreference(
                StpUtil.getLoginIdAsString(),
                body.dailyLimit(),
                body.monthlyLimit());
    }
}
