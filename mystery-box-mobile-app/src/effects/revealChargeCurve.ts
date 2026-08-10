import { Easing } from "./reanimated";
import type { RevealPacing } from "./revealSequence";
import { resolvePhaseEasing } from "./revealEasing";

export type ChargeTensionSegments = {
  slowMs: number;
  accelMs: number;
  stallMs: number;
  loop: boolean;
};

/** Split charge duration: slow start → accelerate → brief stall before burst (high-rare only). */
export function buildChargeTensionDurations(totalMs: number, pacing: RevealPacing): ChargeTensionSegments {
  const isHighRare = pacing === "ceremony" || pacing === "finale";
  if (!isHighRare || totalMs < 200) {
    const half = Math.max(1, Math.round(totalMs / 2));
    return { slowMs: half, accelMs: half, stallMs: 0, loop: true };
  }
  const stallMs = Math.min(80, Math.round(totalMs * 0.12));
  const remain = Math.max(0, totalMs - stallMs);
  const slowMs = Math.round(remain * 0.42);
  const accelMs = Math.max(1, remain - slowMs);
  return { slowMs, accelMs, stallMs, loop: false };
}

export function chargeSegmentEasing(pacing: RevealPacing, segment: "slow" | "accel" | "stall") {
  if (segment === "slow") return Easing.in(Easing.cubic);
  if (segment === "stall") return Easing.linear;
  return resolvePhaseEasing("charge", pacing);
}
