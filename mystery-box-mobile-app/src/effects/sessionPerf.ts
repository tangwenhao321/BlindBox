
export type PerfDegradeLevel = 0 | 1 | 2 | 3;

let sessionDegraded = false;
let degradeLevel: PerfDegradeLevel = 0;

export function markRevealPerformanceDegraded() {
  sessionDegraded = true;
  degradeLevel = Math.min(3, degradeLevel + 1) as PerfDegradeLevel;
}

export function isRevealPerformanceDegraded() {
  return sessionDegraded;
}

export function getRevealDegradeLevel(): PerfDegradeLevel {
  if (!isRevealPerformanceDegraded()) return 0;
  return degradeLevel || 1;
}

export function resetRevealPerformanceSession() {
  sessionDegraded = false;
  degradeLevel = 0;
}
