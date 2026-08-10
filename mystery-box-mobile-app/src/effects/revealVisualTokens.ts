export const revealVisualTokens = {
  cardRadius: 20,
  pillRadius: 999,
  modalRadius: 24,
  borderWidth: 1.5,
  borderWidthStrong: 2.5,
  shadowOpacity: 0.28,
  shadowRadius: 14,
  elevation: 8,
  textTierTitle: { fontSize: 13, fontWeight: "700" as const, opacity: 0.92, letterSpacing: 0.6 },
  textPrizeName: { fontSize: 18, fontWeight: "800" as const, opacity: 1, letterSpacing: 0.2 },
  textAux: { fontSize: 12, fontWeight: "500" as const, opacity: 0.72, letterSpacing: 0.3 },
  textProgress: { fontSize: 11, fontWeight: "600" as const, opacity: 0.85, letterSpacing: 0.4 },
} as const;

export function resolveTextContrastOpacity(baseOpacity: number, strongFlash = false): number {
  return Math.min(1, baseOpacity + (strongFlash ? 0.15 : 0));
}

export function resolveTierTitleStyle(strongFlash = false) {
  const t = revealVisualTokens.textTierTitle;
  return {
    fontSize: t.fontSize,
    fontWeight: t.fontWeight,
    opacity: resolveTextContrastOpacity(t.opacity, strongFlash),
    letterSpacing: t.letterSpacing,
  };
}

export function resolvePrizeNameStyle(strongFlash = false) {
  const t = revealVisualTokens.textPrizeName;
  return {
    fontSize: t.fontSize,
    fontWeight: t.fontWeight,
    opacity: resolveTextContrastOpacity(t.opacity, strongFlash),
    letterSpacing: t.letterSpacing,
  };
}

export function resolveAuxTextStyle() {
  const t = revealVisualTokens.textAux;
  return { fontSize: t.fontSize, fontWeight: t.fontWeight, opacity: t.opacity, letterSpacing: t.letterSpacing };
}

export function resolveProgressTextStyle() {
  const t = revealVisualTokens.textProgress;
  return { fontSize: t.fontSize, fontWeight: t.fontWeight, opacity: t.opacity, letterSpacing: t.letterSpacing };
}
