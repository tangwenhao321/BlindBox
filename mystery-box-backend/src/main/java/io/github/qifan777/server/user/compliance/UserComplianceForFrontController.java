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
    private final UserIdentityVerificationService userIdentityVerificationService;
    private final MinorProtectionService minorProtectionService;

    @GetMapping("age")
    public Map<String, Boolean> ageStatus() {
        String userId = StpUtil.getLoginIdAsString();
        return Map.of("confirmed", userComplianceService.isAgeConfirmed(userId));
    }

    @PostMapping("confirm-age")
    public void confirmAge(@RequestBody(required = false) ConfirmAgeRequest body) {
        userComplianceService.confirmAge(
                StpUtil.getLoginIdAsString(),
                body == null ? null : body.birthYear());
    }

    public record ConfirmAgeRequest(Integer birthYear) {
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

    /**
     * Canonical identity verify path for mobile.
     * Accepts either document-only ({@code documentNumber}/{@code fullName}) or full
     * ({@code realName}/{@code idNumber}/{@code birthDate}) payloads.
     */
    @PostMapping("identity/verify")
    public UserIdentityVerificationService.VerificationResult verifyIdentity(@RequestBody IdentityVerifyRequest body) {
        String userId = StpUtil.getLoginIdAsString();
        String name = firstNonBlank(body == null ? null : body.realName(), body == null ? null : body.fullName());
        String idNumber = firstNonBlank(body == null ? null : body.idNumber(), body == null ? null : body.documentNumber());
        if (body != null && body.birthDate() != null) {
            return userIdentityVerificationService.verify(userId, name, idNumber, body.birthDate());
        }
        return userIdentityVerificationService.verifyFromDocument(userId, name, idNumber);
    }

    private static String firstNonBlank(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) {
            return primary;
        }
        return fallback;
    }

    @GetMapping("identity")
    public Map<String, Object> identityStatus() {
        String userId = StpUtil.getLoginIdAsString();
        MinorProtectionService.MinorPolicy policy = minorProtectionService.resolvePolicy(userId);
        var identity = userIdentityVerificationService.find(userId);
        return Map.of(
                "verified", policy.verified(),
                "ageTier", policy.ageTier().name(),
                "purchaseAllowed", policy.purchaseAllowed(),
                "audioVolumeScale", policy.audioVolumeScale(),
                "muteHiddenBgm", minorProtectionService.shouldMuteHiddenBgm(policy),
                "muteAllCeremonyAudio", minorProtectionService.shouldMuteAllCeremonyAudio(policy),
                "minor", policy.minor(),
                "maskedIdNumber", identity.map(UserIdentityVerificationService.VerifiedIdentity::maskedIdNumber).orElse(""),
                "hardDailyCapMinor", policy.hardDailyCapMinor() == null ? "" : policy.hardDailyCapMinor().toPlainString()
        );
    }

    public record IdentityVerifyRequest(
            String realName,
            String idNumber,
            java.time.LocalDate birthDate,
            String fullName,
            String documentNumber
    ) {
    }
}
