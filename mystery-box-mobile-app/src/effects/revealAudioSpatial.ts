/** Stereo pan for multi-draw reveals: finale stays centered. */
export function resolveRevealSoundPan(
  revealIndex: number,
  totalReveals: number,
  isFinaleDraw = false,
): number {
  if (isFinaleDraw || totalReveals <= 1) return 0;
  const t = revealIndex / Math.max(1, totalReveals - 1);
  return Math.round((t - 0.5) * 60) / 100;
}

/** Volume bias simulating L/R pan when native pan is unavailable. */
export function resolvePanVolumeScale(pan: number): number {
  const bias = Math.abs(pan) * 0.12;
  return Math.max(0.78, 1 - bias);
}
