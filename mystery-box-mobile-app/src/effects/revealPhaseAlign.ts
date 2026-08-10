export type RevealPhaseAlign = {
  cardFlipDelayMs: number;
  flashDelayMs: number;
  prizeCardScaleDelayMs: number;
};

/** Stagger card/flash/prize start within a batch window so multi-draw reveals stay in phase. */
export function alignRevealPhaseStart(revealIndex: number, total: number): RevealPhaseAlign {
  const batchWindow = Math.min(Math.max(1, total), 50);
  const idxInWindow = revealIndex % batchWindow;
  const ratio = batchWindow <= 1 ? 0 : idxInWindow / (batchWindow - 1);
  const staggerMs = Math.round(ratio * 120);
  return {
    cardFlipDelayMs: staggerMs,
    flashDelayMs: Math.round(staggerMs * 0.5),
    prizeCardScaleDelayMs: Math.round(staggerMs * 0.75),
  };
}
