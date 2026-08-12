import { useCallback, useEffect, useState } from "react";

import { parseError } from "../api";

import { ENTERPRISE_WECHAT_ID, SUPPORT_HOTLINE } from "../config/constants";

import { setRemotePaymentMode } from "../config/payment";
import { setRemoteCurrency } from "../utils/formatCurrency";

import { syncRevealExperimentFromConfig } from "../effects/revealExperiment";
import { syncFestivalTemplateCache } from "../effects/revealAssetManager";
import { setRevealRemoteConfig } from "../effects/revealRemote";
import { loadEquippedThemeId, loadThemeUnlockState } from "../effects/revealThemeRotation";
import { setRevealNetworkRtt } from "../effects/revealNetworkTier";

import { fetchAppPublicConfig, parseRevealCopyPoolSizes, parseRevealPhaseEasingPresets, parseRevealTierElementFlags, type AppPublicConfig } from "../services/appConfigService";

import { readCachedPublicConfig, writeCachedPublicConfig } from "../utils/appPublicConfigCache";
import { setRuntimeFeatureFlags } from "../utils/runtimeFeatureFlags";
import { setRuntimeRevealCeremonyTemplateId } from "../utils/revealSettings";
import { normalizeCeremonyTemplateId } from "../effects/revealCeremonyTemplate";

const DEFAULT_CONFIG: AppPublicConfig = {
  supportHotline: SUPPORT_HOTLINE,
  enterpriseWechat: ENTERPRISE_WECHAT_ID,
  revealParticleScale: 1,
  revealConfettiScale: 1,
  revealDelayMsOverride: 0,
  revealChargeScale: 1,
  revealFlashScale: 1,
  revealLustreScale: 1,
  revealFeedTickerEnabled: true,
  revealInterDrawDelayMs: 280,
  revealFinalePauseMs: 420,
  revealFinaleHoldMsExtra: 300,
  revealFinaleTeaserEnabled: true,
  revealSilenceBeforeFinaleMs: 220,
  revealSummaryHeroMs: 1800,
};

function parseVoiceLineUrisSafe(raw?: string): Record<string, string> | undefined {
  if (!raw?.trim()) return undefined;
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return undefined;
  }
}

function applyRevealConfig(next: AppPublicConfig) {
  syncRevealExperimentFromConfig(next.configTemplateId, next.configVersion);
  setRevealRemoteConfig({
    configVersion: next.configVersion,
    configTemplateId: next.configTemplateId,
    particleScale: next.revealParticleScale,
    confettiScale: next.revealConfettiScale,
    delayMsOverride: next.revealDelayMsOverride,
    chargeScale: next.revealChargeScale,
    flashScale: next.revealFlashScale,
    lustreScale: next.revealLustreScale,
    lustrePaletteId: next.revealLustrePaletteId,
    revealLustreBoxOverrides: next.revealLustreBoxOverrides,
    feedTickerEnabled: next.revealFeedTickerEnabled,
    feedTickerMinTier: next.revealFeedTickerMinTier === "LEGENDARY" ? "LEGENDARY" : "HIDDEN",
    themeId: next.revealThemeId,
    currentTheme: next.revealCurrentTheme ?? next.revealThemeId,
    rotationCycle: next.revealRotationCycle ?? 7,
    randomTriggerRate: next.revealRandomTriggerRate ?? 0.05,
    introVideoUri: next.revealIntroVideoUri,
    interDrawDelayMs: Math.min(Math.max(0, next.revealInterDrawDelayMs ?? 280), 320),
    finalePauseMs: Math.min(Math.max(0, next.revealFinalePauseMs ?? 420), 520),
    finaleHoldMsExtra: Math.min(Math.max(0, next.revealFinaleHoldMsExtra ?? 300), 420),
    finaleTeaserEnabled: next.revealFinaleTeaserEnabled,
    finaleTeaserHapticEnabled: next.revealFinaleTeaserHapticEnabled ?? true,
    finaleTeaserSoundEnabled: next.revealFinaleTeaserSoundEnabled ?? true,
    silenceBeforeFinaleMs: next.revealSilenceBeforeFinaleMs,
    summaryHeroMs: Math.min(Math.max(1200, next.revealSummaryHeroMs ?? 1800), 2200),
    comfortGapBoostMs: Math.min(Math.max(0, next.revealComfortGapBoostMs ?? 0), 40),
    cardBackPulseScale: next.revealCardBackPulseScale ?? 1,
    reduceMotionLevel:
      next.revealReduceMotionLevel === "light" || next.revealReduceMotionLevel === "heavy"
        ? next.revealReduceMotionLevel
        : "medium",
    highlightsPanelEnabled: next.revealHighlightsPanelEnabled ?? true,
    boxTapInteractionEnabled: next.revealBoxTapInteractionEnabled ?? true,
    collectionEasterEggEnabled: next.revealCollectionEasterEggEnabled ?? true,
    tierElementFlags: parseRevealTierElementFlags(next.revealTierElementFlags),
    phaseEasingPresets: parseRevealPhaseEasingPresets(next.revealPhaseEasingPresets),
    shortDrawSlowScale: Math.min(Math.max(0.85, next.revealShortDrawSlowScale ?? 1), 1.05),
    longDrawFrontScale: Math.min(Math.max(0.92, next.revealLongDrawFrontScale ?? 0.98), 1.05),
    longDrawFinaleScale: Math.min(Math.max(1, next.revealLongDrawFinaleScale ?? 1.08), 1.15),
    batchRevealThreshold: next.revealBatchRevealThreshold ?? 24,
    batchRevealSize: next.revealBatchRevealSize ?? 8,
    actionLockMs: next.revealActionLockMs ?? 320,
    exitSettleMs: next.revealExitSettleMs ?? 180,
    effectVarianceScale: next.revealEffectVarianceScale ?? 0.15,
    limitedThemeId: next.revealLimitedThemeId,
    limitedThemePriority: next.revealLimitedThemePriority ?? 0,
    copyPoolSizes: parseRevealCopyPoolSizes(next.revealCopyPoolSizes),
    audioFadeOutMs: next.revealAudioFadeOutMs ?? 120,
    vibrateFallbackEnabled: next.revealVibrateFallbackEnabled ?? true,
    feedTickerTapEnabled: next.revealFeedTickerTapEnabled ?? true,
    feedTickerPeakMultiplier: next.revealFeedTickerPeakMultiplier ?? 1.35,
    batchPreset:
      next.revealBatchPreset === "medium20" || next.revealBatchPreset === "mega50"
        ? next.revealBatchPreset
        : "default",
    batchBeatEnabled: next.revealBatchBeatEnabled ?? true,
    batchBeatMs: next.revealBatchBeatMs ?? 900,
    achievementHintsEnabled: next.revealAchievementHintsEnabled ?? true,
    replayDailyCap: next.revealReplayDailyCap ?? 20,
    replayDegradeAfter: next.revealReplayDegradeAfter ?? 12,
    backgroundResumeMaxMs: next.revealBackgroundResumeMaxMs ?? 120_000,
    compactRevealScale: next.revealCompactRevealScale ?? 0.82,
    boxDragInteractionEnabled: next.revealBoxDragInteractionEnabled ?? true,
    voiceLineUris: parseVoiceLineUrisSafe(next.revealVoiceLineUris),
    rareWatermarkEnabled: next.revealRareWatermarkEnabled ?? false,
    feedTickerBlocklist: next.revealFeedTickerBlocklist
      ? next.revealFeedTickerBlocklist.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
      : undefined,
    refreshRateHighScale: next.revealRefreshRateHighScale,
    refreshRateLowScale: next.revealRefreshRateLowScale,
    darkFlashScale: next.revealDarkFlashScale,
    feedTickerTtlMs: next.revealFeedTickerTtlMs,
    atmosphereBuffEnabled: next.revealAtmosphereBuffEnabled,
    ambientTapParticlesEnabled: next.revealAmbientTapParticlesEnabled,
    activeEventTagUri: next.revealActiveEventTagUri,
    festivalTemplateId: next.revealFestivalTemplateId,
    shareTemplatePriority: next.revealShareTemplatePriority,
    sessionIdleResetMs: next.revealSessionIdleResetMs,
  });
  syncFestivalTemplateCache(next.revealFestivalTemplateId);
  void loadThemeUnlockState();
  void loadEquippedThemeId();
  const templateFromConfig = normalizeCeremonyTemplateId(next.configTemplateId);
  if (templateFromConfig !== "standard" || next.configTemplateId) {
    setRuntimeRevealCeremonyTemplateId(templateFromConfig);
  }
}

function normalizeConfig(remote: AppPublicConfig): AppPublicConfig {
  return {
    supportHotline: remote.supportHotline || SUPPORT_HOTLINE,
    enterpriseWechat: remote.enterpriseWechat || ENTERPRISE_WECHAT_ID,
    revealParticleScale: remote.revealParticleScale,
    revealConfettiScale: remote.revealConfettiScale,
    revealDelayMsOverride: remote.revealDelayMsOverride,
    revealChargeScale: remote.revealChargeScale,
    revealFlashScale: remote.revealFlashScale,
    revealLustreScale: remote.revealLustreScale,
    revealLustrePaletteId: remote.revealLustrePaletteId,
    revealLustreBoxOverrides: remote.revealLustreBoxOverrides,
    revealFeedTickerEnabled: remote.revealFeedTickerEnabled,
    revealThemeId: remote.revealThemeId,
    revealCurrentTheme: remote.revealCurrentTheme,
    revealRotationCycle: remote.revealRotationCycle,
    revealRandomTriggerRate: remote.revealRandomTriggerRate,
    revealIntroVideoUri: remote.revealIntroVideoUri,
    revealInterDrawDelayMs: remote.revealInterDrawDelayMs,
    revealFinalePauseMs: remote.revealFinalePauseMs,
    revealFinaleHoldMsExtra: remote.revealFinaleHoldMsExtra,
    revealFinaleTeaserEnabled: remote.revealFinaleTeaserEnabled,
    revealSilenceBeforeFinaleMs: remote.revealSilenceBeforeFinaleMs,
    revealSummaryHeroMs: remote.revealSummaryHeroMs,
    configVersion: remote.configVersion,
    configTemplateId: remote.configTemplateId,
    revealFeedTickerMinTier: remote.revealFeedTickerMinTier,
    revealFinaleTeaserHapticEnabled: remote.revealFinaleTeaserHapticEnabled,
    revealFinaleTeaserSoundEnabled: remote.revealFinaleTeaserSoundEnabled,
    revealComfortGapBoostMs: remote.revealComfortGapBoostMs,
    revealCardBackPulseScale: remote.revealCardBackPulseScale,
    revealReduceMotionLevel: remote.revealReduceMotionLevel,
    revealHighlightsPanelEnabled: remote.revealHighlightsPanelEnabled,
    revealBoxTapInteractionEnabled: remote.revealBoxTapInteractionEnabled,
    revealCollectionEasterEggEnabled: remote.revealCollectionEasterEggEnabled,
    revealTierElementFlags: remote.revealTierElementFlags,
    revealPhaseEasingPresets: remote.revealPhaseEasingPresets,
    revealShortDrawSlowScale: remote.revealShortDrawSlowScale,
    revealLongDrawFrontScale: remote.revealLongDrawFrontScale,
    revealLongDrawFinaleScale: remote.revealLongDrawFinaleScale,
    revealBatchRevealThreshold: remote.revealBatchRevealThreshold,
    revealBatchRevealSize: remote.revealBatchRevealSize,
    revealActionLockMs: remote.revealActionLockMs,
    revealExitSettleMs: remote.revealExitSettleMs,
    revealEffectVarianceScale: remote.revealEffectVarianceScale,
    revealLimitedThemeId: remote.revealLimitedThemeId,
    revealLimitedThemePriority: remote.revealLimitedThemePriority,
    revealCopyPoolSizes: remote.revealCopyPoolSizes,
    revealAudioFadeOutMs: remote.revealAudioFadeOutMs,
    revealVibrateFallbackEnabled: remote.revealVibrateFallbackEnabled,
    revealFeedTickerTapEnabled: remote.revealFeedTickerTapEnabled,
    revealFeedTickerPeakMultiplier: remote.revealFeedTickerPeakMultiplier,
    revealBatchPreset: remote.revealBatchPreset,
    revealBatchBeatEnabled: remote.revealBatchBeatEnabled,
    revealBatchBeatMs: remote.revealBatchBeatMs,
    revealAchievementHintsEnabled: remote.revealAchievementHintsEnabled,
    revealReplayDailyCap: remote.revealReplayDailyCap,
    revealReplayDegradeAfter: remote.revealReplayDegradeAfter,
    revealBackgroundResumeMaxMs: remote.revealBackgroundResumeMaxMs,
    revealCompactRevealScale: remote.revealCompactRevealScale,
    revealBoxDragInteractionEnabled: remote.revealBoxDragInteractionEnabled,
    revealVoiceLineUris: remote.revealVoiceLineUris,
    revealRareWatermarkEnabled: remote.revealRareWatermarkEnabled,
    revealFeedTickerBlocklist: remote.revealFeedTickerBlocklist,
    revealRefreshRateHighScale: remote.revealRefreshRateHighScale,
    revealRefreshRateLowScale: remote.revealRefreshRateLowScale,
    revealDarkFlashScale: remote.revealDarkFlashScale,
    revealFeedTickerTtlMs: remote.revealFeedTickerTtlMs,
    revealAtmosphereBuffEnabled: remote.revealAtmosphereBuffEnabled,
    revealAmbientTapParticlesEnabled: remote.revealAmbientTapParticlesEnabled,
    revealActiveEventTagUri: remote.revealActiveEventTagUri,
    revealFestivalTemplateId: remote.revealFestivalTemplateId,
    revealShareTemplatePriority: remote.revealShareTemplatePriority,
    revealSessionIdleResetMs: remote.revealSessionIdleResetMs,
    paymentProvider: remote.paymentProvider,
    currency: remote.currency,
    supportZaloOaId: remote.supportZaloOaId,
    defaultLocale: remote.defaultLocale,
    logisticsMode: remote.logisticsMode,
    marketplaceFeeRate: remote.marketplaceFeeRate,
    momoEnabled: remote.momoEnabled === true,
    zaloLoginEnabled: remote.zaloLoginEnabled === true,
    featureFlags: remote.featureFlags,
  };
}

function applyPaymentProvider(next: AppPublicConfig) {
  setRemotePaymentMode(next.paymentProvider ?? null);
  setRemoteCurrency(next.currency ?? null);
}

function applyFeatureFlags(next: AppPublicConfig) {
  setRuntimeFeatureFlags(next.featureFlags);
}

export function useAppPublicConfig(opts?: { boxId?: string; categoryId?: string; themeId?: string }) {
  const [config, setConfig] = useState<AppPublicConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const boxId = opts?.boxId;
  const categoryId = opts?.categoryId;
  const themeId = opts?.themeId;

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const cached = await readCachedPublicConfig();
    if (cached) {
      const next = normalizeConfig(cached as AppPublicConfig);
      setConfig(next);
      applyRevealConfig(next);
      applyPaymentProvider(next);
      applyFeatureFlags(next);
    }
    try {
      const started = Date.now();
      const remote = await fetchAppPublicConfig({ boxId, categoryId, themeId });
      setRevealNetworkRtt(Date.now() - started);
      const next = normalizeConfig(remote);
      setConfig(next);
      applyRevealConfig(next);
      applyPaymentProvider(next);
      applyFeatureFlags(next);
      await writeCachedPublicConfig(next);
    } catch (error) {
      if (!cached) {
        setLoadError(parseError(error));
      } else {
        setLoadError(parseError(error));
      }
    } finally {
      setLoading(false);
    }
  }, [boxId, categoryId, themeId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ...config, loading, loadError, reload };
}
