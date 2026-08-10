import type { PityProgress } from "../../services/pityService";

export function pityPercentOf(progress: PityProgress): number {
  if (progress.threshold <= 0) return 0;
  return Math.min(100, Math.round((progress.current / progress.threshold) * 100));
}
