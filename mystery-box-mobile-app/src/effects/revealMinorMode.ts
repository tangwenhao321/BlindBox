let minorModeActive = false;
let minorAudioScale = 1;

export function setRevealMinorModeActive(active: boolean): void {
  minorModeActive = active;
}

export function isRevealMinorModeActive(): boolean {
  return minorModeActive;
}

/** Bind reveal minor mode from verified age tier (API), not only a remote feature flag. */
export function applyAgeTierToRevealMinorMode(ageTier: string | null | undefined, minor?: boolean): void {
  const tier = (ageTier ?? "").toUpperCase();
  const isMinor =
    minor === true || tier === "CHILD" || tier === "YOUNG_TEEN" || tier === "TEEN";
  setRevealMinorModeActive(isMinor);
  if (tier === "CHILD") {
    setMinorAudioScale(0);
  } else if (tier === "YOUNG_TEEN") {
    setMinorAudioScale(0.5);
  } else if (tier === "TEEN") {
    setMinorAudioScale(0.5);
  } else if (!isMinor) {
    setMinorAudioScale(1);
  }
}

export function setMinorAudioScale(scale: number): void {
  if (!Number.isFinite(scale)) {
    minorAudioScale = 1;
    return;
  }
  minorAudioScale = Math.max(0, Math.min(1, scale));
}

export function getMinorAudioScale(): number {
  return minorAudioScale;
}

export function resolveMinorModeReplayDailyCap(): number {
  return minorModeActive ? 5 : 20;
}
