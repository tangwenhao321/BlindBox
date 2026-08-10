import type { ThemeColors } from "../styles/themes";

export type AmbientLightCoeffs = {
  shadowOpacityScale: number;
  shadowOffsetYScale: number;
  spotLightOpacityScale: number;
};

/** Adjust card shadow/spotlight from shell theme brightness. */
export function resolveAmbientLightCoeffs(
  colors: Pick<ThemeColors, "bgPage" | "bgCard">,
  overlayDimAlpha = 0.92,
): AmbientLightCoeffs {
  const pageLum = luminance(colors.bgPage);
  const isDarkShell = pageLum < 0.35;
  const dim = Math.min(1, Math.max(0, overlayDimAlpha));
  const shadowOpacityScale = isDarkShell ? 0.88 + dim * 0.08 : 1.05 - dim * 0.12;
  const shadowOffsetYScale = isDarkShell ? 1.1 : 0.92;
  const spotLightOpacityScale = isDarkShell ? 0.95 : 1.08;
  return { shadowOpacityScale, shadowOffsetYScale, spotLightOpacityScale };
}

function luminance(hex: string): number {
  const raw = hex.replace("#", "");
  if (raw.length < 6) return 0.5;
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Backdrop alpha: deepen during guarded touch or flash peaks (base ~0.85). */
export function resolveBackdropDimAlpha(opts?: {
  touchPhaseGuarded?: boolean;
  flashOpacity?: number;
  baseAlpha?: number;
}): number {
  "worklet";
  const base = opts?.baseAlpha ?? 0.85;
  let alpha = base;
  if (opts?.touchPhaseGuarded) alpha += 0.06;
  if ((opts?.flashOpacity ?? 0) > 0.3) alpha += 0.05;
  return Math.min(0.96, alpha);
}
