/** Heartbeat volume curve for the ~1.2s suspense charge (0.3→0.6 across t∈[0,1]). */
export function heartbeatVolumeAt(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 0.3 + 0.3 * x;
}

/** Alias: volume multipliers for normalized charge progress. */
export const heartbeatVolumeMultiplier = heartbeatVolumeAt;

/** BPM interpolates 60→120 across the charge window. */
export function heartbeatBpmAt(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 60 + 60 * x;
}

export const SUSPENSE_CHARGE_MS = 1200;
