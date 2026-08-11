import type { EffectProfile } from "./config";
import { isRevealPerformanceDegraded } from "./sessionPerf";
import type { BatchRevealPreset } from "./revealAdaptiveRhythm";
import { SUSPENSE_CHARGE_MS } from "./revealHeartbeat";
import { resolveNetworkTierParticleScale, shouldForceClassicRevealNetwork } from "./revealNetworkTier";

export type ReduceMotionLevel = "light" | "medium" | "heavy";
export type FeedTickerMinTier = "HIDDEN" | "LEGENDARY";

export type RevealRemoteConfig = {
  configVersion?: string;
  configTemplateId?: string;
  particleScale: number;
  confettiScale: number;
  delayMsOverride: number;
  chargeScale: number;
  flashScale: number;
  lustreScale: number;
  lustrePaletteId?: string;
  lustreBoxOverrides?: Record<string, string>;
  feedTickerEnabled: boolean;
  feedTickerMinTier: FeedTickerMinTier;
  themeId?: string;
  /** Doc2 weekly / config-center theme alias (adventure|cyberpunk|asmr|party|…). */
  currentTheme?: string;
  /** Days per weekly rotation cycle (default 7). */
  rotationCycle: number;
  /** Chance to roll a surprise Doc2 theme per open (default 0.05). */
  randomTriggerRate: number;
  introVideoUri?: string;
  interDrawDelayMs: number;
  finalePauseMs: number;
  finaleHoldMsExtra: number;
  finaleTeaserEnabled: boolean;
  finaleTeaserHapticEnabled: boolean;
  finaleTeaserSoundEnabled: boolean;
  silenceBeforeFinaleMs: number;
  summaryHeroMs: number;
  comfortGapBoostMs: number;
  cardBackPulseScale: number;
  reduceMotionLevel: ReduceMotionLevel;
  highlightsPanelEnabled: boolean;
  boxTapInteractionEnabled: boolean;
  collectionEasterEggEnabled: boolean;
  tierElementFlags?: Record<string, Record<string, boolean>>;
  /** Per-phase easing preset keys (remote JSON map). */
  phaseEasingPresets?: Record<string, string>;
  shortDrawSlowScale: number;
  longDrawFrontScale: number;
  longDrawFinaleScale: number;
  batchRevealThreshold: number;
  batchRevealSize: number;
  batchPreset: BatchRevealPreset;
  batchBeatEnabled: boolean;
  batchBeatMs: number;
  actionLockMs: number;
  exitSettleMs: number;
  effectVarianceScale: number;
  limitedThemeId?: string;
  limitedThemePriority: number;
  copyPoolSizes: { general: number; rare: number; finale: number; ultimate: number };
  audioFadeOutMs: number;
  vibrateFallbackEnabled: boolean;
  feedTickerTapEnabled: boolean;
  feedTickerPeakMultiplier: number;
  rareWatermarkEnabled: boolean;
  rareWatermarkOpacity: number;
  achievementHintsEnabled: boolean;
  replayDailyCap: number;
  replayDegradeAfter: number;
  backgroundResumeMaxMs: number;
  sessionIdleResetMs: number;
  compactRevealScale: number;
  boxDragInteractionEnabled: boolean;
  voiceLineUris?: Record<string, string>;
  feedTickerBlocklist?: string[];
  refreshRateHighScale: number;
  refreshRateLowScale: number;
  darkFlashScale: number;
  feedTickerTtlMs: number;
  atmosphereBuffEnabled: boolean;
  ambientTapParticlesEnabled: boolean;
  activeEventTagUri?: string;
  festivalTemplateId?: string;
  shareTemplatePriority: number;
};

let cached: RevealRemoteConfig | null = null;

const DEFAULTS: RevealRemoteConfig = {
  particleScale: 1,
  confettiScale: 1,
  delayMsOverride: 0,
  chargeScale: 1,
  flashScale: 1,
  lustreScale: 1,
  feedTickerEnabled: true,
  feedTickerMinTier: "HIDDEN",
  themeId: undefined,
  currentTheme: undefined,
  rotationCycle: 7,
  randomTriggerRate: 0.05,
  introVideoUri: undefined,
  interDrawDelayMs: 280,
  finalePauseMs: 420,
  finaleHoldMsExtra: 300,
  finaleTeaserEnabled: true,
  finaleTeaserHapticEnabled: true,
  finaleTeaserSoundEnabled: true,
  silenceBeforeFinaleMs: 220,
  summaryHeroMs: 1800,
  comfortGapBoostMs: 0,
  cardBackPulseScale: 1,
  reduceMotionLevel: "medium",
  highlightsPanelEnabled: true,
  boxTapInteractionEnabled: true,
  collectionEasterEggEnabled: true,
  shortDrawSlowScale: 1,
  longDrawFrontScale: 0.98,
  longDrawFinaleScale: 1.08,
  batchRevealThreshold: 24,
  batchRevealSize: 8,
  batchPreset: "default" as BatchRevealPreset,
  batchBeatEnabled: true,
  batchBeatMs: 900,
  actionLockMs: 320,
  exitSettleMs: 180,
  effectVarianceScale: 0.15,
  limitedThemePriority: 0,
  copyPoolSizes: { general: 4, rare: 4, finale: 4, ultimate: 3 },
  audioFadeOutMs: 120,
  vibrateFallbackEnabled: true,
  feedTickerTapEnabled: true,
  feedTickerPeakMultiplier: 1.35,
  rareWatermarkEnabled: false,
  rareWatermarkOpacity: 0.14,
  achievementHintsEnabled: true,
  replayDailyCap: 20,
  replayDegradeAfter: 12,
  backgroundResumeMaxMs: 120_000,
  sessionIdleResetMs: 30 * 60 * 1000,
  compactRevealScale: 0.82,
  boxDragInteractionEnabled: true,
  refreshRateHighScale: 0.94,
  refreshRateLowScale: 1.04,
  darkFlashScale: 0.6,
  feedTickerTtlMs: 86_400_000,
  atmosphereBuffEnabled: false,
  ambientTapParticlesEnabled: true,
  shareTemplatePriority: 0,
};

export function setRevealRemoteConfig(
  config: Partial<
    RevealRemoteConfig & {
      revealLustreBoxOverrides?: string;
      revealBatchPreset?: BatchRevealPreset;
      revealBatchBeatEnabled?: boolean;
      revealBatchBeatMs?: number;
      revealAchievementHintsEnabled?: boolean;
      revealReplayDailyCap?: number;
      revealReplayDegradeAfter?: number;
      revealBackgroundResumeMaxMs?: number;
      revealSessionIdleResetMs?: number;
      revealCompactRevealScale?: number;
      revealBoxDragInteractionEnabled?: boolean;
      revealVoiceLineUris?: string | Record<string, string>;
      revealFeedTickerBlocklist?: string | string[];
      revealRefreshRateHighScale?: number;
      revealRefreshRateLowScale?: number;
      revealDarkFlashScale?: number;
      revealFeedTickerTtlMs?: number;
      revealAtmosphereBuffEnabled?: boolean;
      revealAmbientTapParticlesEnabled?: boolean;
      revealActiveEventTagUri?: string;
      revealFestivalTemplateId?: string;
      revealShareTemplatePriority?: number;
      revealCurrentTheme?: string;
      revealRotationCycle?: number;
      revealRandomTriggerRate?: number;
    }
  > | null,
) {
  if (!config) {
    cached = null;
    return;
  }
  cached = {
    configVersion: config.configVersion?.trim() || undefined,
    configTemplateId: config.configTemplateId?.trim() || undefined,
    particleScale: clampScale(config.particleScale ?? 1),
    confettiScale: clampScale(config.confettiScale ?? 1),
    delayMsOverride: clampMs(config.delayMsOverride ?? 0, 0, MS_OVERRIDE_MAX),
    chargeScale: clampScale(config.chargeScale ?? 1),
    flashScale: clampScale(config.flashScale ?? 1),
    lustreScale: clampScale(config.lustreScale ?? 1),
    lustrePaletteId: config.lustrePaletteId?.trim() || undefined,
    lustreBoxOverrides:
      config.lustreBoxOverrides ??
      (typeof config.revealLustreBoxOverrides === "string"
        ? parseLustreBoxOverrides(config.revealLustreBoxOverrides)
        : undefined),
    feedTickerEnabled: config.feedTickerEnabled ?? true,
    feedTickerMinTier:
      config.feedTickerMinTier === "LEGENDARY" ? "LEGENDARY" : "HIDDEN",
    themeId: config.themeId?.trim() || undefined,
    currentTheme: config.currentTheme?.trim() || config.revealCurrentTheme?.trim() || undefined,
    rotationCycle: Math.max(1, Math.round(config.rotationCycle ?? config.revealRotationCycle ?? DEFAULTS.rotationCycle)),
    randomTriggerRate: clampUnit(
      config.randomTriggerRate ?? config.revealRandomTriggerRate ?? DEFAULTS.randomTriggerRate,
    ),
    introVideoUri: config.introVideoUri?.trim() || undefined,
    interDrawDelayMs: clampMs(config.interDrawDelayMs ?? DEFAULTS.interDrawDelayMs, 0, MS_STEP_MAX),
    finalePauseMs: clampMs(config.finalePauseMs ?? DEFAULTS.finalePauseMs, 0, MS_STEP_MAX),
    finaleHoldMsExtra: clampMs(config.finaleHoldMsExtra ?? DEFAULTS.finaleHoldMsExtra, 0, MS_STEP_MAX),
    finaleTeaserEnabled: config.finaleTeaserEnabled ?? DEFAULTS.finaleTeaserEnabled,
    finaleTeaserHapticEnabled: config.finaleTeaserHapticEnabled ?? DEFAULTS.finaleTeaserHapticEnabled,
    finaleTeaserSoundEnabled: config.finaleTeaserSoundEnabled ?? DEFAULTS.finaleTeaserSoundEnabled,
    silenceBeforeFinaleMs: clampMs(config.silenceBeforeFinaleMs ?? DEFAULTS.silenceBeforeFinaleMs, 0, MS_STEP_MAX),
    summaryHeroMs: clampMs(config.summaryHeroMs ?? DEFAULTS.summaryHeroMs, 0, MS_HERO_MAX),
    comfortGapBoostMs: clampMs(config.comfortGapBoostMs ?? DEFAULTS.comfortGapBoostMs, 0, MS_STEP_MAX),
    cardBackPulseScale: clampScale(config.cardBackPulseScale ?? DEFAULTS.cardBackPulseScale),
    reduceMotionLevel:
      config.reduceMotionLevel === "light" || config.reduceMotionLevel === "heavy"
        ? config.reduceMotionLevel
        : "medium",
    highlightsPanelEnabled: config.highlightsPanelEnabled ?? DEFAULTS.highlightsPanelEnabled,
    boxTapInteractionEnabled: config.boxTapInteractionEnabled ?? DEFAULTS.boxTapInteractionEnabled,
    collectionEasterEggEnabled: config.collectionEasterEggEnabled ?? DEFAULTS.collectionEasterEggEnabled,
    tierElementFlags: config.tierElementFlags,
    phaseEasingPresets: config.phaseEasingPresets,
    shortDrawSlowScale: clampScale(config.shortDrawSlowScale ?? DEFAULTS.shortDrawSlowScale),
    longDrawFrontScale: clampScale(config.longDrawFrontScale ?? DEFAULTS.longDrawFrontScale),
    longDrawFinaleScale: clampScale(config.longDrawFinaleScale ?? DEFAULTS.longDrawFinaleScale),
    batchRevealThreshold: Math.max(8, config.batchRevealThreshold ?? DEFAULTS.batchRevealThreshold),
    batchRevealSize: Math.max(4, config.batchRevealSize ?? DEFAULTS.batchRevealSize),
    batchPreset:
      config.batchPreset === "medium20" || config.batchPreset === "mega50"
        ? config.batchPreset
        : config.revealBatchPreset === "medium20" || config.revealBatchPreset === "mega50"
          ? config.revealBatchPreset
          : "default",
    batchBeatEnabled: config.batchBeatEnabled ?? config.revealBatchBeatEnabled ?? DEFAULTS.batchBeatEnabled,
    batchBeatMs: Math.max(400, config.batchBeatMs ?? config.revealBatchBeatMs ?? DEFAULTS.batchBeatMs),
    actionLockMs: Math.max(120, config.actionLockMs ?? DEFAULTS.actionLockMs),
    exitSettleMs: Math.max(0, config.exitSettleMs ?? DEFAULTS.exitSettleMs),
    effectVarianceScale: clampScale(config.effectVarianceScale ?? DEFAULTS.effectVarianceScale),
    limitedThemeId: config.limitedThemeId?.trim() || undefined,
    limitedThemePriority: config.limitedThemePriority ?? DEFAULTS.limitedThemePriority,
    copyPoolSizes: config.copyPoolSizes ?? DEFAULTS.copyPoolSizes,
    audioFadeOutMs: Math.max(0, config.audioFadeOutMs ?? DEFAULTS.audioFadeOutMs),
    vibrateFallbackEnabled: config.vibrateFallbackEnabled ?? DEFAULTS.vibrateFallbackEnabled,
    feedTickerTapEnabled: config.feedTickerTapEnabled ?? DEFAULTS.feedTickerTapEnabled,
    feedTickerPeakMultiplier: clampScale(config.feedTickerPeakMultiplier ?? DEFAULTS.feedTickerPeakMultiplier),
    rareWatermarkEnabled: config.rareWatermarkEnabled ?? DEFAULTS.rareWatermarkEnabled,
    rareWatermarkOpacity: clampScale(config.rareWatermarkOpacity ?? DEFAULTS.rareWatermarkOpacity),
    achievementHintsEnabled:
      config.achievementHintsEnabled ??
      config.revealAchievementHintsEnabled ??
      DEFAULTS.achievementHintsEnabled,
    replayDailyCap: Math.max(1, config.replayDailyCap ?? config.revealReplayDailyCap ?? DEFAULTS.replayDailyCap),
    replayDegradeAfter: Math.max(
      1,
      config.replayDegradeAfter ?? config.revealReplayDegradeAfter ?? DEFAULTS.replayDegradeAfter,
    ),
    backgroundResumeMaxMs: Math.max(
      5_000,
      config.backgroundResumeMaxMs ?? config.revealBackgroundResumeMaxMs ?? DEFAULTS.backgroundResumeMaxMs,
    ),
    sessionIdleResetMs: Math.max(
      60_000,
      config.sessionIdleResetMs ?? config.revealSessionIdleResetMs ?? DEFAULTS.sessionIdleResetMs,
    ),
    compactRevealScale: clampScale(
      config.compactRevealScale ?? config.revealCompactRevealScale ?? DEFAULTS.compactRevealScale,
    ),
    boxDragInteractionEnabled:
      config.boxDragInteractionEnabled ??
      config.revealBoxDragInteractionEnabled ??
      DEFAULTS.boxDragInteractionEnabled,
    voiceLineUris: parseVoiceLineUris(config.voiceLineUris ?? config.revealVoiceLineUris),
    feedTickerBlocklist: parseFeedTickerBlocklist(
      config.feedTickerBlocklist ?? config.revealFeedTickerBlocklist,
    ),
    refreshRateHighScale: clampScale(config.refreshRateHighScale ?? config.revealRefreshRateHighScale ?? DEFAULTS.refreshRateHighScale),
    refreshRateLowScale: clampScale(config.refreshRateLowScale ?? config.revealRefreshRateLowScale ?? DEFAULTS.refreshRateLowScale),
    darkFlashScale: clampScale(config.darkFlashScale ?? config.revealDarkFlashScale ?? DEFAULTS.darkFlashScale),
    feedTickerTtlMs: Math.max(60_000, config.feedTickerTtlMs ?? config.revealFeedTickerTtlMs ?? DEFAULTS.feedTickerTtlMs),
    atmosphereBuffEnabled: config.atmosphereBuffEnabled ?? config.revealAtmosphereBuffEnabled ?? DEFAULTS.atmosphereBuffEnabled,
    ambientTapParticlesEnabled:
      config.ambientTapParticlesEnabled ?? config.revealAmbientTapParticlesEnabled ?? DEFAULTS.ambientTapParticlesEnabled,
    activeEventTagUri: config.activeEventTagUri?.trim() || config.revealActiveEventTagUri?.trim() || undefined,
    festivalTemplateId: config.festivalTemplateId?.trim() || config.revealFestivalTemplateId?.trim() || undefined,
    shareTemplatePriority: config.shareTemplatePriority ?? config.revealShareTemplatePriority ?? DEFAULTS.shareTemplatePriority,
  };
}

export function resolveCardBackPulseIntensity(isRare: boolean): number {
  const scale = getRevealRemoteConfig().cardBackPulseScale;
  if (scale <= 0) return 0;
  return isRare ? 0.7 * scale : 0.3 * scale;
}

export function getRevealRemoteConfig(): RevealRemoteConfig {
  return cached ?? DEFAULTS;
}

/** 解析 `boxId:paletteId` 列表，如 `box-1:vivid,box-2:neon` */
export function parseLustreBoxOverrides(raw?: string): Record<string, string> {
  if (!raw?.trim()) return {};
  const map: Record<string, string> = {};
  for (const segment of raw.split(/[,;]/)) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(":");
    if (colon <= 0) continue;
    const boxId = trimmed.slice(0, colon).trim();
    const paletteId = trimmed.slice(colon + 1).trim().toLowerCase();
    if (boxId && paletteId) map[boxId] = paletteId;
  }
  return map;
}

export function resolveLustrePaletteIdForBox(boxId?: string): string | undefined {
  const remote = getRevealRemoteConfig();
  if (boxId && remote.lustreBoxOverrides?.[boxId]) {
    return remote.lustreBoxOverrides[boxId];
  }
  return remote.lustrePaletteId;
}

/** 远程调节琉光层 / 扫光 / 边框强度（0.25–2，默认 1；低性能机再 ×0.55） */
export function resolveLustreIntensity(baseIntensity: number, opts?: { lowPerf?: boolean }): number {
  const scale = getRevealRemoteConfig().lustreScale;
  const lowPerf = opts?.lowPerf ?? isRevealPerformanceDegraded();
  let intensity = baseIntensity * scale;
  if (lowPerf) intensity *= 0.55;
  return Math.min(1, Math.max(0.12, intensity));
}

/** 低性能 / 减少动效时关闭琉光扫光，保留渐变描边 */
export function shouldReduceLustreMotion(reduceMotion = false): boolean {
  return reduceMotion || isRevealPerformanceDegraded();
}

function clampScale(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(2, Math.max(0.25, value));
}

function clampUnit(value: number) {
  if (!Number.isFinite(value)) return 0.05;
  return Math.min(1, Math.max(0, value));
}

/** Clamp remote millisecond values with upper bounds to prevent config abuse. */
export function clampMs(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

const MS_STEP_MAX = 8_000;
const MS_HERO_MAX = 12_000;
const MS_OVERRIDE_MAX = 15_000;

function parseVoiceLineUris(raw?: string | Record<string, string>): Record<string, string> | undefined {
  if (!raw) return undefined;
  if (typeof raw === "object") return raw;
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return typeof parsed === "object" && parsed ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function parseFeedTickerBlocklist(raw?: string | string[]): string[] | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : undefined;
  } catch {
    return raw
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

export function applyRemoteRevealProfile(profile: EffectProfile): EffectProfile {
  const remote = getRevealRemoteConfig();
  const netParticle = resolveNetworkTierParticleScale();
  const weakClassic = shouldForceClassicRevealNetwork();
  const particleScale = remote.particleScale * netParticle * (weakClassic ? 0.55 : 1);
  const confettiScale = remote.confettiScale * (weakClassic ? 0.5 : 1);
  const chargeMs =
    profile.chargeMs > 0
      ? Math.round(Math.max(profile.chargeMs, SUSPENSE_CHARGE_MS) * remote.chargeScale)
      : 0;
  return {
    ...profile,
    particleCount: Math.min(120, Math.round(profile.particleCount * particleScale)),
    confettiCount: Math.min(64, Math.round(profile.confettiCount * confettiScale)),
    revealDelayMs:
      remote.delayMsOverride > 0 ? remote.delayMsOverride : profile.revealDelayMs,
    chargeMs,
    flashPeak: Math.min(1, profile.flashPeak * remote.flashScale),
  };
}
