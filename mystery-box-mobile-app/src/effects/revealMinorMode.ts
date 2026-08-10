let minorModeActive = false;

export function setRevealMinorModeActive(active: boolean): void {
  minorModeActive = active;
}

export function isRevealMinorModeActive(): boolean {
  return minorModeActive;
}

export function resolveMinorModeReplayDailyCap(): number {
  return minorModeActive ? 5 : 20;
}
