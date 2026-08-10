import { getRevealRemoteConfig } from "./revealRemote";

export type BatchRevealPreset = "default" | "medium20" | "mega50";

const PRESET_WINDOWS: Record<BatchRevealPreset, { threshold: number; batchSize: number }> = {
  default: { threshold: 24, batchSize: 8 },
  medium20: { threshold: 20, batchSize: 10 },
  mega50: { threshold: 50, batchSize: 12 },
};

/** Scale animation/gap durations by total draw count and position. */
export function resolveDrawCountRhythmScale(total: number, revealIndex: number): number {
  const remote = getRevealRemoteConfig();
  if (total <= 0) return 1;
  if (total <= 3) {
    return remote.shortDrawSlowScale ?? 1.12;
  }
  if (total >= 10) {
    const progress = revealIndex / Math.max(1, total - 1);
    if (progress < 0.55) return remote.longDrawFrontScale ?? 0.98;
    if (progress >= 0.85) return remote.longDrawFinaleScale ?? 1.08;
    return 1;
  }
  return 1;
}

export function resolveBatchRevealWindow(total: number): {
  batchSize: number;
  enabled: boolean;
  preset: BatchRevealPreset;
} {
  const remote = getRevealRemoteConfig();
  const preset = remote.batchPreset ?? "default";
  const presetWindow = PRESET_WINDOWS[preset] ?? PRESET_WINDOWS.default;
  const threshold = remote.batchRevealThreshold ?? presetWindow.threshold;
  const batchSize = Math.max(4, remote.batchRevealSize ?? presetWindow.batchSize);
  return { batchSize, enabled: total >= threshold, preset };
}

export function shouldShowBatchBeat(
  revealIndex: number,
  total: number,
  batchSize: number,
): boolean {
  const remote = getRevealRemoteConfig();
  if (!remote.batchBeatEnabled) return false;
  if (total < batchSize * 2) return false;
  const batchEnd = Math.floor(revealIndex / batchSize) * batchSize + batchSize - 1;
  return revealIndex === batchEnd && revealIndex < total - 1;
}
