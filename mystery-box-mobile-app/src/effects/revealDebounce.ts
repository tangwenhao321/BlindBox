const lastFire = new Map<string, number>();

export function debounceRevealAction(action: string, ms: number): boolean {
  const now = Date.now();
  const prev = lastFire.get(action) ?? 0;
  if (now - prev < ms) return false;
  lastFire.set(action, now);
  return true;
}

export const REVEAL_DEBOUNCE_MS = {
  skip: 120,
  replay: 400,
  share: 600,
} as const;

export function resetRevealDebounceForTests(): void {
  lastFire.clear();
}
