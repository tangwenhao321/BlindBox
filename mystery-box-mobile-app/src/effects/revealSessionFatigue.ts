import { trackEffectEvent } from "./telemetry";

const WINDOW_MS = 15 * 60 * 1000;
const revealTimestamps: number[] = [];

export function recordRevealForFatigue(now = Date.now()): void {
  revealTimestamps.push(now);
  while (revealTimestamps.length > 0 && now - revealTimestamps[0] > WINDOW_MS) {
    revealTimestamps.shift();
  }
}

export function resolveSessionFatigueScale(now = Date.now()): number {
  while (revealTimestamps.length > 0 && now - revealTimestamps[0] > WINDOW_MS) {
    revealTimestamps.shift();
  }
  const count = revealTimestamps.length;
  if (count <= 8) return 1;
  if (count <= 16) return 0.82;
  if (count <= 24) return 0.68;
  const scale = Math.max(0.45, 1 - count * 0.015);
  trackEffectEvent("reveal_session_fatigue", { count, scale });
  return scale;
}

export function resetSessionFatigueForTests(): void {
  revealTimestamps.length = 0;
}
