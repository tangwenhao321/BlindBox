package io.github.qifan777.server.user.compliance;

import io.github.qifan777.server.infrastructure.money.MoneyRounding;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

/**
 * Turns a verified age into the concrete restrictions the rest of the app applies.
 *
 * <p>Deliberately holds no reference to {@link UserSpendLimitService}: the spend service asks this one
 * for a tier and a cap ratio, never the other way round, so there is one direction of dependency and
 * one place that decides what a given age is allowed to do.
 */
@Service
@RequiredArgsConstructor
public class MinorProtectionService {
    private final UserIdentityVerificationService identityVerificationService;
    private final MarketProperties marketProperties;

    @Value("${security.compliance.minor.enabled:true}")
    private boolean enabled;

    /**
     * When true, an account with no verified identity cannot buy at all. Off by default because turning
     * it on mid-life would lock out every existing user until they verify; it is the switch to flip once
     * the verification flow has been rolled out.
     */
    @Value("${security.compliance.minor.verification-required:false}")
    private boolean verificationRequired;

    /** Hard daily spend cap for TEEN (16-17). Default 140 is CNY-scale; set VND amount in prod-vn. */
    @Value("${app.compliance.teen-daily-cap:140}")
    private BigDecimal teenDailyCap;

    @Value("${app.identity.provider:local}")
    private String identityProvider;

    /**
     * When false, checksum-only local identities do not count as verified (prod-vn default).
     * Flip true only for non-prod or explicit acceptance of local CCCD checks.
     */
    @Value("${app.identity.trust-local-verification:false}")
    private boolean trustLocalVerification;

    public MinorPolicy resolvePolicy(String userId) {
        if (!enabled) {
            return MinorPolicy.unrestricted();
        }
        Optional<UserIdentityVerificationService.VerifiedIdentity> identity = identityVerificationService.find(userId);
        if (identity.isPresent() && !trustsStoredIdentity()) {
            identity = Optional.empty();
        }
        if (identity.isEmpty()) {
            return new MinorPolicy(true, false, AgeTier.ADULT, !verificationRequired, 1d, 1d, false, false, null, null);
        }
        UserIdentityVerificationService.VerifiedIdentity verified = identity.get();
        AgeTier tier = identityVerificationService.resolveCurrentTier(verified);
        boolean guardianProvided = verified.guardianContact() != null && !verified.guardianContact().isBlank();
        BigDecimal hardDaily = tier == AgeTier.TEEN ? hardDailyCapMinor() : null;
        return new MinorPolicy(
                true,
                true,
                tier,
                tier.purchaseAllowed(),
                tier.spendRatio(),
                tier.audioVolumeScale(),
                tier.minor(),
                guardianProvided,
                verified.birthDate(),
                hardDaily
        );
    }

    public BigDecimal hardDailyCapMinor() {
        String currency = marketProperties.getCurrency();
        if (teenDailyCap == null || teenDailyCap.signum() <= 0) {
            return MoneyRounding.round(BigDecimal.valueOf(140), currency);
        }
        return MoneyRounding.round(teenDailyCap, currency);
    }

    private boolean trustsStoredIdentity() {
        String provider = identityProvider == null ? "local" : identityProvider.trim().toLowerCase();
        if (provider.isBlank() || "local".equals(provider)) {
            return trustLocalVerification;
        }
        // Stub ekyc_vendor must not count as verified until Partner isReady().
        if ("ekyc_vendor".equals(provider)) {
            return false;
        }
        return true;
    }

    /**
     * First of the two interception points (the other is just before payment). Both matter: an order can
     * be created one day and paid the next, and a user's tier can change in between.
     */
    public void assertPurchaseAllowed(String userId) {
        MinorPolicy policy = resolvePolicy(userId);
        if (!policy.enabled()) {
            return;
        }
        if (!policy.verified() && verificationRequired) {
            String hint = "ekyc_vendor".equalsIgnoreCase(String.valueOf(identityProvider))
                    ? "请先完成实名认证（eKYC）后再下单"
                    : "请先完成实名认证后再下单（当前为本地身份校验；生产请接入 ekyc_vendor）";
            throw new BusinessException("IDENTITY_VERIFICATION_REQUIRED: " + hint);
        }
        if (!policy.purchaseAllowed()) {
            throw new BusinessException("MINOR_PURCHASE_FORBIDDEN: 根据实名信息，未满 8 周岁用户无法购买盲盒");
        }
    }

    /** Scales a platform cap down to what the user's age band allows, then applies the TEEN hard daily cap. */
    public BigDecimal applyTierCap(BigDecimal serverCap, MinorPolicy policy) {
        if (serverCap == null || policy == null || !policy.enabled() || policy.spendRatio() >= 1d) {
            return applyHardDailyCap(serverCap, policy);
        }
        BigDecimal ratioCapped = MoneyRounding.roundDown(
                serverCap.multiply(BigDecimal.valueOf(policy.spendRatio())),
                marketProperties.getCurrency());
        return applyHardDailyCap(ratioCapped, policy);
    }

    private BigDecimal applyHardDailyCap(BigDecimal capped, MinorPolicy policy) {
        if (capped == null || policy == null || policy.hardDailyCapMinor() == null) {
            return capped;
        }
        return capped.min(policy.hardDailyCapMinor());
    }

    /** CHILD (scale 0): mute the entire reveal ceremony, including hidden BGM. */
    public boolean shouldMuteAllCeremonyAudio(MinorPolicy policy) {
        return policy != null && policy.enabled() && policy.audioVolumeScale() <= 0d;
    }

    /** Soften or mute hidden-tier BGM for non-adults. */
    public boolean shouldMuteHiddenBgm(MinorPolicy policy) {
        return policy != null && policy.enabled() && policy.minor();
    }

    public record MinorPolicy(
            boolean enabled,
            boolean verified,
            AgeTier ageTier,
            boolean purchaseAllowed,
            double spendRatio,
            double audioVolumeScale,
            boolean minor,
            boolean guardianContactProvided,
            LocalDate birthDate,
            BigDecimal hardDailyCapMinor
    ) {
        public static MinorPolicy unrestricted() {
            return new MinorPolicy(false, false, AgeTier.ADULT, true, 1d, 1d, false, false, null, null);
        }
    }
}
