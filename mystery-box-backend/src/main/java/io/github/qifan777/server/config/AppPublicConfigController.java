package io.github.qifan777.server.config;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.ops.service.AppRevealConfigService;
import io.github.qifan777.server.ops.service.FeatureFlagService;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.payment.config.MoMoProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("front/app")
@RequiredArgsConstructor
public class AppPublicConfigController {
    private final MarketProperties marketProperties;
    private final MoMoProperties moMoProperties;
    private final FeatureFlagService featureFlagService;
    private final AppRevealConfigService appRevealConfigService;

    @Value("${app.auth.zalo-enabled:false}")
    private boolean zaloLoginEnabled;

    @Value("${app.marketplace.fee-rate:0.05}")
    private BigDecimal marketplaceFeeRate;

    @Value("${app.support.hotline:}")
    private String supportHotline;

    @Value("${app.support.enterprise-wechat:}")
    private String enterpriseWechat;

    @Value("${app.reveal.particle-scale:1.0}")
    private double revealParticleScale;

    @Value("${app.reveal.confetti-scale:1.0}")
    private double revealConfettiScale;

    /** 0 表示使用客户端默认时长 */
    @Value("${app.reveal.delay-ms-override:0}")
    private int revealDelayMsOverride;

    @Value("${app.reveal.charge-scale:1.0}")
    private double revealChargeScale;

    @Value("${app.reveal.flash-scale:1.0}")
    private double revealFlashScale;

    @Value("${app.reveal.lustre-scale:1.0}")
    private double revealLustreScale;

    /** 远程琉光 palette：neon | cute | luxury | warm | cool | vivid */
    @Value("${app.reveal.lustre-palette-id:}")
    private String revealLustrePaletteId;

    /** 按盲盒覆盖琉光 palette，如 box-1:vivid,box-2:neon */
    @Value("${app.reveal.lustre-box-overrides:}")
    private String revealLustreBoxOverrides;

    @Value("${app.reveal.feed-ticker-enabled:true}")
    private boolean revealFeedTickerEnabled;

    @Value("${app.reveal.theme-id:}")
    private String revealThemeId;

    @Value("${app.reveal.intro-video-uri:}")
    private String revealIntroVideoUri;

    @Value("${app.reveal.inter-draw-delay-ms:450}")
    private int revealInterDrawDelayMs;

    @Value("${app.reveal.finale-pause-ms:600}")
    private int revealFinalePauseMs;

    @Value("${app.reveal.finale-hold-ms-extra:300}")
    private int revealFinaleHoldMsExtra;

    @Value("${app.reveal.finale-teaser-enabled:true}")
    private boolean revealFinaleTeaserEnabled;

    @Value("${app.reveal.silence-before-finale-ms:220}")
    private int revealSilenceBeforeFinaleMs;

    @Value("${app.reveal.summary-hero-ms:1800}")
    private int revealSummaryHeroMs;

    @Value("${app.reveal.feed-ticker-min-tier:HIDDEN}")
    private String revealFeedTickerMinTier;

    @Value("${app.reveal.finale-teaser-haptic-enabled:true}")
    private boolean revealFinaleTeaserHapticEnabled;

    @Value("${app.reveal.finale-teaser-sound-enabled:true}")
    private boolean revealFinaleTeaserSoundEnabled;

    @Value("${app.reveal.comfort-gap-boost-ms:100}")
    private int revealComfortGapBoostMs;

    @Value("${app.reveal.card-back-pulse-scale:1.0}")
    private double revealCardBackPulseScale;

    @Value("${app.reveal.reduce-motion-level:medium}")
    private String revealReduceMotionLevel;

    @Value("${app.reveal.highlights-panel-enabled:false}")
    private boolean revealHighlightsPanelEnabled;

    @Value("${app.reveal.box-tap-interaction-enabled:true}")
    private boolean revealBoxTapInteractionEnabled;

    @Value("${app.reveal.collection-easter-egg-enabled:true}")
    private boolean revealCollectionEasterEggEnabled;

    @Value("${app.reveal.tier-element-flags:}")
    private String revealTierElementFlags;

    @Value("${app.reveal.phase-easing-presets:}")
    private String revealPhaseEasingPresets;

    @Value("${app.reveal.short-draw-slow-scale:1.12}")
    private double revealShortDrawSlowScale;

    @Value("${app.reveal.long-draw-front-scale:0.88}")
    private double revealLongDrawFrontScale;

    @Value("${app.reveal.long-draw-finale-scale:1.08}")
    private double revealLongDrawFinaleScale;

    @Value("${app.reveal.batch-reveal-threshold:24}")
    private int revealBatchRevealThreshold;

    @Value("${app.reveal.batch-reveal-size:8}")
    private int revealBatchRevealSize;

    @Value("${app.reveal.action-lock-ms:320}")
    private int revealActionLockMs;

    @Value("${app.reveal.exit-settle-ms:180}")
    private int revealExitSettleMs;

    @Value("${app.reveal.effect-variance-scale:0.15}")
    private double revealEffectVarianceScale;

    @Value("${app.reveal.limited-theme-id:}")
    private String revealLimitedThemeId;

    @Value("${app.reveal.limited-theme-priority:0}")
    private int revealLimitedThemePriority;

    @Value("${app.reveal.copy-pool-sizes:{\"general\":4,\"rare\":4,\"finale\":4,\"ultimate\":3}}")
    private String revealCopyPoolSizes;

    @Value("${app.reveal.audio-fade-out-ms:120}")
    private int revealAudioFadeOutMs;

    @Value("${app.reveal.vibrate-fallback-enabled:true}")
    private boolean revealVibrateFallbackEnabled;

    @Value("${app.reveal.feed-ticker-tap-enabled:true}")
    private boolean revealFeedTickerTapEnabled;

    @Value("${app.reveal.feed-ticker-peak-multiplier:1.35}")
    private double revealFeedTickerPeakMultiplier;

    @Value("${app.reveal.batch-preset:default}")
    private String revealBatchPreset;

    @Value("${app.reveal.batch-beat-enabled:true}")
    private boolean revealBatchBeatEnabled;

    @Value("${app.reveal.batch-beat-ms:900}")
    private int revealBatchBeatMs;

    @Value("${app.reveal.achievement-hints-enabled:true}")
    private boolean revealAchievementHintsEnabled;

    @Value("${app.reveal.replay-daily-cap:20}")
    private int revealReplayDailyCap;

    @Value("${app.reveal.replay-degrade-after:12}")
    private int revealReplayDegradeAfter;

    @Value("${app.reveal.background-resume-max-ms:120000}")
    private int revealBackgroundResumeMaxMs;

    @Value("${app.reveal.compact-reveal-scale:0.82}")
    private double revealCompactRevealScale;

    @Value("${app.reveal.box-drag-interaction-enabled:true}")
    private boolean revealBoxDragInteractionEnabled;

    @Value("${app.reveal.voice-line-uris:}")
    private String revealVoiceLineUris;

    @Value("${app.reveal.rare-watermark-enabled:true}")
    private boolean revealRareWatermarkEnabled;

    @Value("${app.reveal.feed-ticker-blocklist:}")
    private String revealFeedTickerBlocklist;

    @Value("${app.reveal.refresh-rate-high-scale:0.94}")
    private double revealRefreshRateHighScale;

    @Value("${app.reveal.refresh-rate-low-scale:1.04}")
    private double revealRefreshRateLowScale;

    @Value("${app.reveal.dark-flash-scale:0.6}")
    private double revealDarkFlashScale;

    @Value("${app.reveal.feed-ticker-ttl-ms:86400000}")
    private int revealFeedTickerTtlMs;

    @Value("${app.reveal.atmosphere-buff-enabled:false}")
    private boolean revealAtmosphereBuffEnabled;

    @Value("${app.reveal.ambient-tap-particles-enabled:true}")
    private boolean revealAmbientTapParticlesEnabled;

    @Value("${app.reveal.active-event-tag-uri:}")
    private String revealActiveEventTagUri;

    @Value("${app.reveal.festival-template-id:}")
    private String revealFestivalTemplateId;

    @Value("${app.reveal.share-template-priority:0}")
    private int revealShareTemplatePriority;

    @Value("${app.reveal.session-idle-reset-ms:1800000}")
    private int revealSessionIdleResetMs;

    @Value("${app.reveal.ceremony-template-id:standard}")
    private String revealCeremonyTemplateId;

    @GetMapping("config")
    public AppConfigView config(@RequestParam(required = false) String boxId,
                                @RequestParam(required = false) String categoryId,
                                @RequestParam(required = false) String themeId) {
        String userId = StpUtil.isLogin() ? StpUtil.getLoginIdAsString() : null;
        AppRevealConfigService.RevealFieldOverrides reveal = appRevealConfigService.mergeRevealFields(
                defaultRevealFields(),
                appRevealConfigService.resolveEffectiveConfig(userId, boxId, categoryId, themeId).orElse(null)
        );
        return new AppConfigView(
                supportHotline,
                enterpriseWechat,
                reveal.revealParticleScale(),
                reveal.revealConfettiScale(),
                reveal.revealDelayMsOverride(),
                reveal.revealChargeScale(),
                reveal.revealFlashScale(),
                reveal.revealLustreScale(),
                reveal.revealLustrePaletteId(),
                reveal.revealLustreBoxOverrides(),
                reveal.revealFeedTickerEnabled(),
                reveal.revealFeedTickerMinTier(),
                reveal.revealThemeId(),
                reveal.revealIntroVideoUri(),
                reveal.revealInterDrawDelayMs(),
                reveal.revealFinalePauseMs(),
                reveal.revealFinaleHoldMsExtra(),
                reveal.revealFinaleTeaserEnabled(),
                reveal.revealFinaleTeaserHapticEnabled(),
                reveal.revealFinaleTeaserSoundEnabled(),
                reveal.revealSilenceBeforeFinaleMs(),
                reveal.revealSummaryHeroMs(),
                reveal.revealComfortGapBoostMs(),
                reveal.revealCardBackPulseScale(),
                reveal.revealReduceMotionLevel(),
                reveal.revealHighlightsPanelEnabled(),
                reveal.revealBoxTapInteractionEnabled(),
                reveal.revealCollectionEasterEggEnabled(),
                reveal.revealTierElementFlags(),
                reveal.revealPhaseEasingPresets(),
                reveal.revealShortDrawSlowScale(),
                reveal.revealLongDrawFrontScale(),
                reveal.revealLongDrawFinaleScale(),
                reveal.revealBatchRevealThreshold(),
                reveal.revealBatchRevealSize(),
                reveal.revealActionLockMs(),
                reveal.revealExitSettleMs(),
                reveal.revealEffectVarianceScale(),
                reveal.revealLimitedThemeId(),
                reveal.revealLimitedThemePriority(),
                reveal.revealCopyPoolSizes(),
                reveal.revealAudioFadeOutMs(),
                reveal.revealVibrateFallbackEnabled(),
                reveal.revealFeedTickerTapEnabled(),
                reveal.revealFeedTickerPeakMultiplier(),
                reveal.revealBatchPreset(),
                reveal.revealBatchBeatEnabled(),
                reveal.revealBatchBeatMs(),
                reveal.revealAchievementHintsEnabled(),
                reveal.revealReplayDailyCap(),
                reveal.revealReplayDegradeAfter(),
                reveal.revealBackgroundResumeMaxMs(),
                reveal.revealCompactRevealScale(),
                reveal.revealBoxDragInteractionEnabled(),
                reveal.revealVoiceLineUris(),
                reveal.revealRareWatermarkEnabled(),
                reveal.revealFeedTickerBlocklist(),
                reveal.revealRefreshRateHighScale(),
                reveal.revealRefreshRateLowScale(),
                reveal.revealDarkFlashScale(),
                reveal.revealFeedTickerTtlMs(),
                reveal.revealAtmosphereBuffEnabled(),
                reveal.revealAmbientTapParticlesEnabled(),
                reveal.revealActiveEventTagUri(),
                reveal.revealFestivalTemplateId(),
                reveal.revealShareTemplatePriority(),
                reveal.revealSessionIdleResetMs(),
                reveal.configVersion(),
                reveal.configTemplateId(),
                marketProperties.getPaymentProvider(),
                marketProperties.getCurrency(),
                marketProperties.getSupportZaloOaId(),
                marketProperties.getDefaultLocale(),
                marketProperties.getLogisticsMode(),
                marketplaceFeeRate == null ? new BigDecimal("0.05") : marketplaceFeeRate,
                // Stub MoMo must never advertise as ready/offered
                moMoProperties.isCheckoutOffered(),
                zaloLoginEnabled,
                featureFlagService.allAsMap()
        );
    }

    private AppRevealConfigService.RevealFieldOverrides defaultRevealFields() {
        return new AppRevealConfigService.RevealFieldOverrides(
                revealParticleScale,
                revealConfettiScale,
                revealDelayMsOverride,
                revealChargeScale,
                revealFlashScale,
                revealLustreScale,
                revealLustrePaletteId,
                revealLustreBoxOverrides,
                revealFeedTickerEnabled,
                revealFeedTickerMinTier,
                revealThemeId,
                revealIntroVideoUri,
                revealInterDrawDelayMs,
                revealFinalePauseMs,
                revealFinaleHoldMsExtra,
                revealFinaleTeaserEnabled,
                revealFinaleTeaserHapticEnabled,
                revealFinaleTeaserSoundEnabled,
                revealSilenceBeforeFinaleMs,
                revealSummaryHeroMs,
                revealComfortGapBoostMs,
                revealCardBackPulseScale,
                revealReduceMotionLevel,
                revealHighlightsPanelEnabled,
                revealBoxTapInteractionEnabled,
                revealCollectionEasterEggEnabled,
                revealTierElementFlags,
                revealPhaseEasingPresets,
                revealShortDrawSlowScale,
                revealLongDrawFrontScale,
                revealLongDrawFinaleScale,
                revealBatchRevealThreshold,
                revealBatchRevealSize,
                revealActionLockMs,
                revealExitSettleMs,
                revealEffectVarianceScale,
                revealLimitedThemeId,
                revealLimitedThemePriority,
                revealCopyPoolSizes,
                revealAudioFadeOutMs,
                revealVibrateFallbackEnabled,
                revealFeedTickerTapEnabled,
                revealFeedTickerPeakMultiplier,
                revealBatchPreset,
                revealBatchBeatEnabled,
                revealBatchBeatMs,
                revealAchievementHintsEnabled,
                revealReplayDailyCap,
                revealReplayDegradeAfter,
                revealBackgroundResumeMaxMs,
                revealCompactRevealScale,
                revealBoxDragInteractionEnabled,
                revealVoiceLineUris,
                revealRareWatermarkEnabled,
                revealFeedTickerBlocklist,
                revealRefreshRateHighScale,
                revealRefreshRateLowScale,
                revealDarkFlashScale,
                revealFeedTickerTtlMs,
                revealAtmosphereBuffEnabled,
                revealAmbientTapParticlesEnabled,
                revealActiveEventTagUri,
                revealFestivalTemplateId,
                revealShareTemplatePriority,
                revealSessionIdleResetMs,
                revealCeremonyTemplateId,
                null,
                null
        );
    }

    public record AppConfigView(
            String supportHotline,
            String enterpriseWechat,
            double revealParticleScale,
            double revealConfettiScale,
            int revealDelayMsOverride,
            double revealChargeScale,
            double revealFlashScale,
            double revealLustreScale,
            String revealLustrePaletteId,
            String revealLustreBoxOverrides,
            boolean revealFeedTickerEnabled,
            String revealFeedTickerMinTier,
            String revealThemeId,
            String revealIntroVideoUri,
            int revealInterDrawDelayMs,
            int revealFinalePauseMs,
            int revealFinaleHoldMsExtra,
            boolean revealFinaleTeaserEnabled,
            boolean revealFinaleTeaserHapticEnabled,
            boolean revealFinaleTeaserSoundEnabled,
            int revealSilenceBeforeFinaleMs,
            int revealSummaryHeroMs,
            int revealComfortGapBoostMs,
            double revealCardBackPulseScale,
            String revealReduceMotionLevel,
            boolean revealHighlightsPanelEnabled,
            boolean revealBoxTapInteractionEnabled,
            boolean revealCollectionEasterEggEnabled,
            String revealTierElementFlags,
            String revealPhaseEasingPresets,
            double revealShortDrawSlowScale,
            double revealLongDrawFrontScale,
            double revealLongDrawFinaleScale,
            int revealBatchRevealThreshold,
            int revealBatchRevealSize,
            int revealActionLockMs,
            int revealExitSettleMs,
            double revealEffectVarianceScale,
            String revealLimitedThemeId,
            int revealLimitedThemePriority,
            String revealCopyPoolSizes,
            int revealAudioFadeOutMs,
            boolean revealVibrateFallbackEnabled,
            boolean revealFeedTickerTapEnabled,
            double revealFeedTickerPeakMultiplier,
            String revealBatchPreset,
            boolean revealBatchBeatEnabled,
            int revealBatchBeatMs,
            boolean revealAchievementHintsEnabled,
            int revealReplayDailyCap,
            int revealReplayDegradeAfter,
            int revealBackgroundResumeMaxMs,
            double revealCompactRevealScale,
            boolean revealBoxDragInteractionEnabled,
            String revealVoiceLineUris,
            boolean revealRareWatermarkEnabled,
            String revealFeedTickerBlocklist,
            double revealRefreshRateHighScale,
            double revealRefreshRateLowScale,
            double revealDarkFlashScale,
            int revealFeedTickerTtlMs,
            boolean revealAtmosphereBuffEnabled,
            boolean revealAmbientTapParticlesEnabled,
            String revealActiveEventTagUri,
            String revealFestivalTemplateId,
            int revealShareTemplatePriority,
            int revealSessionIdleResetMs,
            String configVersion,
            String configTemplateId,
            String paymentProvider,
            String currency,
            String supportZaloOaId,
            String defaultLocale,
            String logisticsMode,
            BigDecimal marketplaceFeeRate,
            boolean momoEnabled,
            boolean zaloLoginEnabled,
            Map<String, Boolean> featureFlags
    ) {
    }
}
