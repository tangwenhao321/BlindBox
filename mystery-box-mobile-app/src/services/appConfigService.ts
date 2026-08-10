import { api } from "../api";
import type { PaymentMode } from "../config/payment";

export type AppPublicConfig = {
  supportHotline: string;
  enterpriseWechat: string;
  revealParticleScale: number;
  revealConfettiScale: number;
  revealDelayMsOverride: number;
  revealChargeScale: number;
  revealFlashScale: number;
  revealLustreScale: number;
  revealLustrePaletteId?: string;
  revealLustreBoxOverrides?: string;
  revealFeedTickerEnabled: boolean;
  revealThemeId?: string;
  revealIntroVideoUri?: string;
  revealInterDrawDelayMs: number;
  revealFinalePauseMs: number;
  revealFinaleHoldMsExtra: number;
  revealFinaleTeaserEnabled: boolean;
  revealSilenceBeforeFinaleMs: number;
  revealSummaryHeroMs: number;
  configVersion?: string;
  configTemplateId?: string;
  revealFeedTickerMinTier?: string;
  revealFinaleTeaserHapticEnabled?: boolean;
  revealFinaleTeaserSoundEnabled?: boolean;
  revealComfortGapBoostMs?: number;
  revealCardBackPulseScale?: number;
  revealReduceMotionLevel?: string;
  revealHighlightsPanelEnabled?: boolean;
  revealBoxTapInteractionEnabled?: boolean;
  revealCollectionEasterEggEnabled?: boolean;
  revealTierElementFlags?: string;
  revealPhaseEasingPresets?: string;
  revealShortDrawSlowScale?: number;
  revealLongDrawFrontScale?: number;
  revealLongDrawFinaleScale?: number;
  revealBatchRevealThreshold?: number;
  revealBatchRevealSize?: number;
  revealActionLockMs?: number;
  revealExitSettleMs?: number;
  revealEffectVarianceScale?: number;
  revealLimitedThemeId?: string;
  revealLimitedThemePriority?: number;
  revealCopyPoolSizes?: string;
  revealAudioFadeOutMs?: number;
  revealVibrateFallbackEnabled?: boolean;
  revealFeedTickerTapEnabled?: boolean;
  revealFeedTickerPeakMultiplier?: number;
  revealBatchPreset?: string;
  revealBatchBeatEnabled?: boolean;
  revealBatchBeatMs?: number;
  revealAchievementHintsEnabled?: boolean;
  revealReplayDailyCap?: number;
  revealReplayDegradeAfter?: number;
  revealBackgroundResumeMaxMs?: number;
  revealCompactRevealScale?: number;
  revealBoxDragInteractionEnabled?: boolean;
  revealVoiceLineUris?: string;
  revealRareWatermarkEnabled?: boolean;
  revealFeedTickerBlocklist?: string;
  revealRefreshRateHighScale?: number;
  revealRefreshRateLowScale?: number;
  revealDarkFlashScale?: number;
  revealFeedTickerTtlMs?: number;
  revealAtmosphereBuffEnabled?: boolean;
  revealAmbientTapParticlesEnabled?: boolean;
  revealActiveEventTagUri?: string;
  revealFestivalTemplateId?: string;
  revealShareTemplatePriority?: number;
  revealSessionIdleResetMs?: number;
  paymentProvider?: PaymentMode;
  currency?: string;
  supportZaloOaId?: string;
  defaultLocale?: string;
  logisticsMode?: string;
  featureFlags?: Record<string, boolean>;
};

function parseFeatureFlags(raw?: string | Record<string, boolean>): Record<string, boolean> | undefined {
  if (!raw) return undefined;
  if (typeof raw === "object") return raw;
  try {
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return typeof parsed === "object" && parsed ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function parseJsonObject<T extends Record<string, unknown>>(raw?: string): T | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const parsed = JSON.parse(raw) as T;
    return typeof parsed === "object" && parsed ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function parseRevealCopyPoolSizes(raw?: string) {
  const parsed = parseJsonObject<{ general?: number; rare?: number; finale?: number; ultimate?: number }>(raw);
  if (!parsed) return undefined;
  return {
    general: Number(parsed.general ?? 4) || 4,
    rare: Number(parsed.rare ?? 4) || 4,
    finale: Number(parsed.finale ?? 4) || 4,
    ultimate: Number(parsed.ultimate ?? 3) || 3,
  };
}

export function parseRevealTierElementFlags(raw?: string) {
  return parseJsonObject<Record<string, Record<string, boolean>>>(raw);
}

export function parseRevealPhaseEasingPresets(raw?: string) {
  return parseJsonObject<Record<string, string>>(raw);
}

function normalizePaymentProvider(value?: string): PaymentMode | undefined {
  const mode = value?.trim().toLowerCase();
  if (mode === "mock" || mode === "wechat" || mode === "vnpay") return mode;
  return undefined;
}

export async function fetchAppPublicConfig(opts?: {
  boxId?: string;
  categoryId?: string;
  themeId?: string;
}): Promise<AppPublicConfig> {
  const response = await api.get<{
    result: {
      supportHotline?: string;
      enterpriseWechat?: string;
      revealParticleScale?: number;
      revealConfettiScale?: number;
      revealDelayMsOverride?: number;
      revealChargeScale?: number;
      revealFlashScale?: number;
      revealLustreScale?: number;
      revealLustrePaletteId?: string;
      revealLustreBoxOverrides?: string;
      revealFeedTickerEnabled?: boolean;
      revealThemeId?: string;
      revealIntroVideoUri?: string;
      revealInterDrawDelayMs?: number;
      revealFinalePauseMs?: number;
      revealFinaleHoldMsExtra?: number;
      revealFinaleTeaserEnabled?: boolean;
      revealSilenceBeforeFinaleMs?: number;
      revealSummaryHeroMs?: number;
      configVersion?: string;
      configTemplateId?: string;
      revealFeedTickerMinTier?: string;
      revealFinaleTeaserHapticEnabled?: boolean;
      revealFinaleTeaserSoundEnabled?: boolean;
      revealComfortGapBoostMs?: number;
      revealCardBackPulseScale?: number;
      revealReduceMotionLevel?: string;
      revealHighlightsPanelEnabled?: boolean;
      revealBoxTapInteractionEnabled?: boolean;
      revealCollectionEasterEggEnabled?: boolean;
      revealTierElementFlags?: string;
      revealPhaseEasingPresets?: string;
      revealShortDrawSlowScale?: number;
      revealLongDrawFrontScale?: number;
      revealLongDrawFinaleScale?: number;
      revealBatchRevealThreshold?: number;
      revealBatchRevealSize?: number;
      revealActionLockMs?: number;
      revealExitSettleMs?: number;
      revealEffectVarianceScale?: number;
      revealLimitedThemeId?: string;
      revealLimitedThemePriority?: number;
      revealCopyPoolSizes?: string;
      revealAudioFadeOutMs?: number;
      revealVibrateFallbackEnabled?: boolean;
      revealFeedTickerTapEnabled?: boolean;
      revealFeedTickerPeakMultiplier?: number;
      revealBatchPreset?: string;
      revealBatchBeatEnabled?: boolean;
      revealBatchBeatMs?: number;
      revealAchievementHintsEnabled?: boolean;
      revealReplayDailyCap?: number;
      revealReplayDegradeAfter?: number;
      revealBackgroundResumeMaxMs?: number;
      revealCompactRevealScale?: number;
      revealBoxDragInteractionEnabled?: boolean;
      revealVoiceLineUris?: string;
      revealRareWatermarkEnabled?: boolean;
      revealFeedTickerBlocklist?: string;
      revealRefreshRateHighScale?: number;
      revealRefreshRateLowScale?: number;
      revealDarkFlashScale?: number;
      revealFeedTickerTtlMs?: number;
      revealAtmosphereBuffEnabled?: boolean;
      revealAmbientTapParticlesEnabled?: boolean;
      revealActiveEventTagUri?: string;
      revealFestivalTemplateId?: string;
      revealShareTemplatePriority?: number;
      revealSessionIdleResetMs?: number;
      paymentProvider?: string;
      currency?: string;
      supportZaloOaId?: string;
      defaultLocale?: string;
      logisticsMode?: string;
      featureFlags?: string | Record<string, boolean>;
    };
  }>("/front/app/config", { params: opts });
  const row = response.data.result;
  return {
    supportHotline: row?.supportHotline?.trim() ?? "",
    enterpriseWechat: row?.enterpriseWechat?.trim() ?? "",
    revealParticleScale: Number(row?.revealParticleScale ?? 1) || 1,
    revealConfettiScale: Number(row?.revealConfettiScale ?? 1) || 1,
    revealDelayMsOverride: Number(row?.revealDelayMsOverride ?? 0) || 0,
    revealChargeScale: Number(row?.revealChargeScale ?? 1) || 1,
    revealFlashScale: Number(row?.revealFlashScale ?? 1) || 1,
    revealLustreScale: Number(row?.revealLustreScale ?? 1) || 1,
    revealLustrePaletteId: row?.revealLustrePaletteId?.trim() || undefined,
    revealLustreBoxOverrides: row?.revealLustreBoxOverrides?.trim() || undefined,
    revealFeedTickerEnabled: row?.revealFeedTickerEnabled !== false,
    revealThemeId: row?.revealThemeId?.trim() || undefined,
    revealIntroVideoUri: row?.revealIntroVideoUri?.trim() || undefined,
    revealInterDrawDelayMs: Number(row?.revealInterDrawDelayMs ?? 450) || 450,
    revealFinalePauseMs: Number(row?.revealFinalePauseMs ?? 600) || 600,
    revealFinaleHoldMsExtra: Number(row?.revealFinaleHoldMsExtra ?? 300) || 300,
    revealFinaleTeaserEnabled: row?.revealFinaleTeaserEnabled !== false,
    revealSilenceBeforeFinaleMs: Number(row?.revealSilenceBeforeFinaleMs ?? 220) || 220,
    revealSummaryHeroMs: Number(row?.revealSummaryHeroMs ?? 1800) || 1800,
    configVersion: row?.configVersion?.trim() || undefined,
    configTemplateId: row?.configTemplateId?.trim() || undefined,
    revealFeedTickerMinTier: row?.revealFeedTickerMinTier?.trim() || undefined,
    revealFinaleTeaserHapticEnabled: row?.revealFinaleTeaserHapticEnabled !== false,
    revealFinaleTeaserSoundEnabled: row?.revealFinaleTeaserSoundEnabled !== false,
    revealComfortGapBoostMs: Number(row?.revealComfortGapBoostMs ?? 100) || 100,
    revealCardBackPulseScale: Number(row?.revealCardBackPulseScale ?? 1) || 1,
    revealReduceMotionLevel: row?.revealReduceMotionLevel?.trim() || undefined,
    revealHighlightsPanelEnabled: row?.revealHighlightsPanelEnabled === true,
    revealBoxTapInteractionEnabled: row?.revealBoxTapInteractionEnabled !== false,
    revealCollectionEasterEggEnabled: row?.revealCollectionEasterEggEnabled !== false,
    revealTierElementFlags: row?.revealTierElementFlags?.trim() || undefined,
    revealPhaseEasingPresets: row?.revealPhaseEasingPresets?.trim() || undefined,
    revealShortDrawSlowScale: Number(row?.revealShortDrawSlowScale ?? 1.12) || 1.12,
    revealLongDrawFrontScale: Number(row?.revealLongDrawFrontScale ?? 0.88) || 0.88,
    revealLongDrawFinaleScale: Number(row?.revealLongDrawFinaleScale ?? 1.08) || 1.08,
    revealBatchRevealThreshold: Number(row?.revealBatchRevealThreshold ?? 24) || 24,
    revealBatchRevealSize: Number(row?.revealBatchRevealSize ?? 8) || 8,
    revealActionLockMs: Number(row?.revealActionLockMs ?? 320) || 320,
    revealExitSettleMs: Number(row?.revealExitSettleMs ?? 180) || 180,
    revealEffectVarianceScale: Number(row?.revealEffectVarianceScale ?? 0.15) || 0.15,
    revealLimitedThemeId: row?.revealLimitedThemeId?.trim() || undefined,
    revealLimitedThemePriority: Number(row?.revealLimitedThemePriority ?? 0) || 0,
    revealCopyPoolSizes: row?.revealCopyPoolSizes?.trim() || undefined,
    revealAudioFadeOutMs: Number(row?.revealAudioFadeOutMs ?? 120) || 120,
    revealVibrateFallbackEnabled: row?.revealVibrateFallbackEnabled !== false,
    revealFeedTickerTapEnabled: row?.revealFeedTickerTapEnabled !== false,
    revealFeedTickerPeakMultiplier: Number(row?.revealFeedTickerPeakMultiplier ?? 1.35) || 1.35,
    revealBatchPreset: row?.revealBatchPreset?.trim() || "default",
    revealBatchBeatEnabled: row?.revealBatchBeatEnabled !== false,
    revealBatchBeatMs: Number(row?.revealBatchBeatMs ?? 900) || 900,
    revealAchievementHintsEnabled: row?.revealAchievementHintsEnabled !== false,
    revealReplayDailyCap: Number(row?.revealReplayDailyCap ?? 20) || 20,
    revealReplayDegradeAfter: Number(row?.revealReplayDegradeAfter ?? 12) || 12,
    revealBackgroundResumeMaxMs: Number(row?.revealBackgroundResumeMaxMs ?? 120_000) || 120_000,
    revealCompactRevealScale: Number(row?.revealCompactRevealScale ?? 0.82) || 0.82,
    revealBoxDragInteractionEnabled: row?.revealBoxDragInteractionEnabled !== false,
    revealVoiceLineUris: row?.revealVoiceLineUris?.trim() || undefined,
    revealRareWatermarkEnabled: row?.revealRareWatermarkEnabled === true,
    revealFeedTickerBlocklist: row?.revealFeedTickerBlocklist?.trim() || undefined,
    revealRefreshRateHighScale: Number(row?.revealRefreshRateHighScale ?? 0.94) || 0.94,
    revealRefreshRateLowScale: Number(row?.revealRefreshRateLowScale ?? 1.04) || 1.04,
    revealDarkFlashScale: Number(row?.revealDarkFlashScale ?? 0.6) || 0.6,
    revealFeedTickerTtlMs: Number(row?.revealFeedTickerTtlMs ?? 86_400_000) || 86_400_000,
    revealAtmosphereBuffEnabled: row?.revealAtmosphereBuffEnabled === true,
    revealAmbientTapParticlesEnabled: row?.revealAmbientTapParticlesEnabled !== false,
    revealActiveEventTagUri: row?.revealActiveEventTagUri?.trim() || undefined,
    revealFestivalTemplateId: row?.revealFestivalTemplateId?.trim() || undefined,
    revealShareTemplatePriority: Number(row?.revealShareTemplatePriority ?? 0) || 0,
    revealSessionIdleResetMs: Number(row?.revealSessionIdleResetMs ?? 1_800_000) || 1_800_000,
    paymentProvider: normalizePaymentProvider(row?.paymentProvider),
    currency: row?.currency?.trim() || undefined,
    supportZaloOaId: row?.supportZaloOaId?.trim() || undefined,
    defaultLocale: row?.defaultLocale?.trim() || undefined,
    logisticsMode: row?.logisticsMode?.trim() || undefined,
    featureFlags: parseFeatureFlags(row?.featureFlags),
  };
}
