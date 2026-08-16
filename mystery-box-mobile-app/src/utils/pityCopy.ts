import type { PityProgress } from "../services/pityService";

export type PityCopyKey = "pityReady" | "pityNext" | "pityHint";

export function resolvePityCopyKey(progress: Pick<PityProgress, "remaining" | "threshold"> | null | undefined): PityCopyKey {
  if (!progress || progress.threshold <= 0) return "pityHint";
  if (progress.remaining <= 0) return "pityReady";
  if (progress.remaining === 1) return "pityNext";
  return "pityHint";
}

export function pityCopyI18nKey(
  progress: Pick<PityProgress, "remaining" | "threshold"> | null | undefined,
  compact = false,
): string {
  const key = resolvePityCopyKey(progress);
  if (!compact) return `boxDetails.${key}`;
  if (key === "pityReady") return "boxDetails.pityNearReady";
  if (key === "pityNext") return "boxDetails.pityNearNext";
  return "boxDetails.pityNearOpen";
}

export function pityPercentOf(progress: Pick<PityProgress, "current" | "threshold"> | null | undefined): number {
  if (!progress || progress.threshold <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((progress.current / progress.threshold) * 100)));
}
