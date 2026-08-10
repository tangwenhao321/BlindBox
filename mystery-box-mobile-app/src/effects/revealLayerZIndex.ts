export const revealLayerZIndex = {
  gapBackdrop: 150,
  backdrop: 200,
  particles: 400,
  rays: 500,
  card: 800,
  chrome: 1200,
  overlay: 2100,
  banner: 2150,
  skipBar: 2200,
  badge: 2250,
  modal: 2300,
} as const;

export type RevealLayerKey = keyof typeof revealLayerZIndex;

export function resolveRevealZIndex(layer: RevealLayerKey): number {
  return revealLayerZIndex[layer];
}

/** Multi-draw card stack: stagger z-index and shadow depth by draw index. */
export function resolveCardStackStagger(revealIndex: number): { zIndex: number; shadowRadiusBoost: number } {
  const lane = revealIndex % 3;
  return {
    zIndex: revealLayerZIndex.card + lane,
    shadowRadiusBoost: lane * 2,
  };
}
