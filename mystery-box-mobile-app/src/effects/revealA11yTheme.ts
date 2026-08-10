import type { ReduceMotionLevel } from "./revealRemote";
import { getRevealRemoteConfig } from "./revealRemote";

export function resolveA11yFlashScale(basePeak: number, highContrast: boolean, isDark: boolean): number {
  let peak = basePeak;
  if (highContrast) peak *= 0.5;
  if (isDark) peak *= getRevealRemoteConfig().darkFlashScale ?? 0.6;
  else peak *= 0.85;
  return Math.min(1, Math.max(0.1, peak));
}

export function resolveA11yLustreScale(base: number, highContrast: boolean, isDark: boolean): number {
  let scale = base;
  if (highContrast) scale *= 0.55;
  if (isDark) scale *= 1.15;
  else scale *= 0.85;
  return Math.min(1.2, Math.max(0.1, scale));
}

export function shouldSkipParticles(level: ReduceMotionLevel, degradeLevel: number): boolean {
  return level !== "light" || degradeLevel >= 1;
}

export function shouldSkipTeaser(level: ReduceMotionLevel, degradeLevel: number): boolean {
  return level === "medium" || level === "heavy" || degradeLevel >= 2;
}

export function shouldSkipSound(level: ReduceMotionLevel): boolean {
  return level === "medium" || level === "heavy";
}

export function shouldSkipShake(level: ReduceMotionLevel, degradeLevel: number): boolean {
  return level !== "light" || degradeLevel >= 1;
}
