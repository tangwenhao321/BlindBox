import { getRevealRemoteConfig } from "./revealRemote";

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type EffectVariance = {
  particleAngleBias: number;
  flashFreqScale: number;
  shakeStepScale: number;
  confettiShapeIndex: number;
  flashAngleDeg: number;
  shakeAmplitudeScale: number;
};

export function resolveEffectVariance(orderId: string, revealIndex: number): EffectVariance {
  const remote = getRevealRemoteConfig();
  const amplitude = Math.min(0.35, Math.max(0, remote.effectVarianceScale ?? 0.15));
  const seed = hashSeed(`${orderId}:${revealIndex}`);
  const unit = (seed % 1000) / 1000;
  const unit2 = ((seed >> 10) % 1000) / 1000;
  const unit3 = ((seed >> 20) % 1000) / 1000;
  const unit4 = ((seed >> 6) % 1000) / 1000;
  const unit5 = ((seed >> 14) % 1000) / 1000;
  return {
    particleAngleBias: (unit - 0.5) * 2 * amplitude,
    flashFreqScale: 1 + (unit2 - 0.5) * amplitude,
    shakeStepScale: 1 + (unit3 - 0.5) * amplitude,
    confettiShapeIndex: Math.floor(unit4 * 4) % 4,
    flashAngleDeg: (unit5 - 0.5) * 40 * amplitude,
    shakeAmplitudeScale: 1 + (unit - 0.5) * amplitude * 0.8,
  };
}
