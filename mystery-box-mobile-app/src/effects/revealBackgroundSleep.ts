let backgroundSleep = false;

export function setRevealBackgroundSleep(active: boolean): void {
  backgroundSleep = active;
}

export function isRevealBackgroundSleep(): boolean {
  return backgroundSleep;
}
