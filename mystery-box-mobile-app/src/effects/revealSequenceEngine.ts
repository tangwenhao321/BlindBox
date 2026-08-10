import type { Product } from "../types";
import { resolveCeremonyTier, type CeremonyTier } from "./ceremonyTier";
import { getRevealRemoteConfig, type RevealRemoteConfig } from "./revealRemote";
import { resolveDrawCountRhythmScale } from "./revealAdaptiveRhythm";
import { resolveBehaviorRhythmScale } from "./revealBehaviorProfile";
import type { RevealPacing } from "./revealSequence";
import { temporaryTurboScale } from "./revealTemporaryTurbo";

export type RevealProgressModel = {
  current: number;
  total: number;
  progress: number;
  subtitleKey: "progressFinaleSoon" | "progressComfort" | "progressDefault";
  subtitleParams: Record<string, never>;
};

const BASE_INTER_GAP_MS = 0;

/** Multi-draw pacing: surprise beats + ramp into finale (not all-flat fast). */
export function resolveRevealPacing(
  revealIndex: number,
  total: number,
  ceremony?: CeremonyTier,
): RevealPacing {
  if (total <= 1) {
    if (ceremony === "TREASURE_PEERLESS" || ceremony === "PEERLESS") return "ceremony";
    return "normal";
  }
  if (revealIndex >= total - 1) {
    if (ceremony === "TREASURE_PEERLESS" || ceremony === "PEERLESS") return "ceremony";
    return "finale";
  }
  if (revealIndex === total - 2) return "normal";
  if (revealIndex === 0) return "normal";
  if (total >= 6 && revealIndex >= total - 4) return "normal";
  if (total >= 5 && revealIndex > 0 && revealIndex % 3 === 2) return "normal";
  return "fast";
}

/** Delay before chaining the next reveal (must allow prize dwell + exit). */
export function resolveChainRevealDelayMs(
  completedIndex: number,
  total: number,
  ceremony?: CeremonyTier,
  orderId?: string,
): number {
  if (total <= 1 || completedIndex >= total - 1) return 0;
  const nextPacing = resolveRevealPacing(completedIndex + 1, total, ceremony);
  let delay =
    nextPacing === "finale" || nextPacing === "ceremony" ? 780 : nextPacing === "normal" ? 580 : 360;
  delay = Math.round(delay * temporaryTurboScale(orderId));
  return Math.max(120, delay);
}

/** Gap before triggering the next reveal animation (after previous completes). */
export function resolveInterRevealGapMs(
  completedIndex: number,
  total: number,
  remote: Pick<
    RevealRemoteConfig,
    "interDrawDelayMs" | "finalePauseMs"
  > = getRevealRemoteConfig(),
  allProducts: Product[] = [],
): number {
  if (total <= 1 || completedIndex >= total - 1) return 0;
  const nextIndex = completedIndex + 1;
  const behaviorScale = resolveBehaviorRhythmScale();
  const composition = resolveOrderCompositionProfile(allProducts);
  const compositionScale = composition === "all-common" ? 0.82 : composition === "multi-rare" ? 1.08 : 1;
  if (nextIndex >= total - 1) {
    return Math.round(
      (BASE_INTER_GAP_MS + Math.max(0, remote.finalePauseMs)) *
        resolveDrawCountRhythmScale(total, nextIndex) *
        behaviorScale *
        compositionScale,
    );
  }
  return Math.round(
    Math.max(0, remote.interDrawDelayMs) *
      resolveDrawCountRhythmScale(total, nextIndex) *
      behaviorScale *
      compositionScale,
  );
}

export function shouldPlayBoxTeaser(revealIndex: number, total: number, remote?: RevealRemoteConfig): boolean {
  const cfg = remote ?? getRevealRemoteConfig();
  if (revealIndex === 0) return true;
  if (revealIndex === total - 1 && total > 1) {
    return cfg.finaleTeaserEnabled;
  }
  if (total >= 5 && revealIndex > 0 && revealIndex < total - 1 && revealIndex % 3 === 2) {
    return true;
  }
  if (total >= 6 && revealIndex >= total - 4 && revealIndex < total - 2) {
    return true;
  }
  return false;
}

export function isFinaleTeaser(revealIndex: number, total: number): boolean {
  return total > 1 && revealIndex === total - 1;
}

export type OrderCompositionProfile = "balanced" | "all-common" | "multi-rare";

export function resolveOrderCompositionProfile(prizes: Product[]): OrderCompositionProfile {
  if (prizes.length === 0) return "balanced";
  let rare = 0;
  for (const p of prizes) {
    const tier = resolveCeremonyTier(p, prizes);
    if (tier !== "GENERAL") rare += 1;
  }
  if (rare === 0) return "all-common";
  if (rare >= Math.ceil(prizes.length * 0.4)) return "multi-rare";
  return "balanced";
}

/** Progress banner model without spoiling the finale prize identity. */
export function buildRevealProgressModel(
  revealedProducts: Product[],
  allProducts: Product[],
  revealIndex: number,
  total: number,
): RevealProgressModel {
  const current = Math.min(revealIndex + 1, total);
  const progress = total > 0 ? current / total : 0;

  if (revealIndex >= total - 2 && total > 2) {
    return {
      current,
      total,
      progress,
      subtitleKey: "progressFinaleSoon",
      subtitleParams: {},
    };
  }

  const comfort = resolveComfortGapBoost(revealedProducts, allProducts);
  if (comfort.streak >= 2) {
    return {
      current,
      total,
      progress,
      subtitleKey: "progressComfort",
      subtitleParams: {},
    };
  }

  return {
    current,
    total,
    progress,
    subtitleKey: "progressDefault",
    subtitleParams: {},
  };
}

/** Boost gap after consecutive general-tier draws (no spoiler). */
export function resolveComfortGapBoost(
  revealedProducts: Product[],
  allProducts: Product[],
): { streak: number; gapBoostMs: number } {
  const remote = getRevealRemoteConfig();
  let streak = 0;
  for (let i = revealedProducts.length - 1; i >= 0; i -= 1) {
    const p = revealedProducts[i];
    const tier = resolveCeremonyTier(p, allProducts);
    if (tier === "GENERAL") streak += 1;
    else break;
  }
  const gapBoostMs = streak >= 3 ? remote.comfortGapBoostMs : 0;
  return { streak, gapBoostMs };
}

export function resolveCeremonyForRevealIndex(products: Product[], revealIndex: number): CeremonyTier | undefined {
  const product = products[revealIndex];
  if (!product) return undefined;
  return resolveCeremonyTier(product, products);
}

export type RevealPhaseName = "tease" | "charge" | "flip" | "burst" | "fade";

const PHASE_HANDOFF_MS: Record<string, number> = {
  "tease:charge": 0,
  "charge:flip": 0,
  "flip:burst": 0,
  "burst:fade": 16,
  "fade:charge": 0,
};

/** Micro-overlap between phases to avoid visible gaps (ms). */
export function resolvePhaseHandoffMs(prev: RevealPhaseName, next: RevealPhaseName): number {
  return PHASE_HANDOFF_MS[`${prev}:${next}`] ?? 0;
}

/** Shared inter-reveal gap for modal and details. */
export function computeInterRevealGapMs(
  currentIndex: number,
  products: Product[],
  includeHandoff = true,
): number {
  if (currentIndex <= 0) return 0;
  const revealed = products.slice(0, currentIndex);
  const comfort = resolveComfortGapBoost(revealed, products);
  const gap =
    resolveInterRevealGapMs(currentIndex - 1, products.length, undefined, products) +
    comfort.gapBoostMs;
  return includeHandoff ? gap + resolvePhaseHandoffMs("fade", "charge") : gap;
}
