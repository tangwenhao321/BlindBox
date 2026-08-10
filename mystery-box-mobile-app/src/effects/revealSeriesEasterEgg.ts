const IDLE_THRESHOLD_MS = 12_000;

let lastInteractionAt = Date.now();

export function touchRevealSeriesEasterEggActivity(now = Date.now()): void {
  lastInteractionAt = now;
}

export function getSeriesEasterEggIdleMs(now = Date.now()): number {
  return Math.max(0, now - lastInteractionAt);
}

export function shouldTriggerSeriesEasterEggMicroAction(now = Date.now()): boolean {
  return getSeriesEasterEggIdleMs(now) >= IDLE_THRESHOLD_MS;
}

export function resetSeriesEasterEggForTests(): void {
  lastInteractionAt = Date.now();
}
