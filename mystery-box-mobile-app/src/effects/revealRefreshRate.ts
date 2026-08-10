import { getRevealRemoteConfig } from "./revealRemote";

let cachedScale = 1;
let lastSampleFps = 60;

/** Update from FPS monitor; high refresh devices get slightly compressed frame gaps. */
export function updateRevealRefreshRateFromFps(fps: number): void {
  lastSampleFps = fps;
  const remote = getRevealRemoteConfig();
  if (fps >= 110) cachedScale = remote.refreshRateHighScale ?? 0.94;
  else if (fps >= 85) cachedScale = remote.refreshRateHighScale ?? 0.96;
  else if (fps < 50) cachedScale = remote.refreshRateLowScale ?? 1.04;
  else cachedScale = 1;
}

export function getRevealRefreshRateScale(): number {
  return cachedScale;
}

export function getLastSampleFps(): number {
  return lastSampleFps;
}

export function resetRevealRefreshRateForTests(): void {
  cachedScale = 1;
  lastSampleFps = 60;
}
