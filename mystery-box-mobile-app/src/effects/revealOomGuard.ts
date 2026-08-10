import { AppState } from "react-native";
import {
  getRevealDegradeLevel,
  markRevealPerformanceDegraded,
  type PerfDegradeLevel,
} from "./sessionPerf";

type OomListener = (level: PerfDegradeLevel) => void;

const listeners = new Set<OomListener>();
let memoryWarningCount = 0;
let subscribed = false;

export function getRevealOomDegradeLadder(): number {
  return Math.min(3, memoryWarningCount);
}

export function notifyRevealMemoryWarning(): void {
  memoryWarningCount += 1;
  markRevealPerformanceDegraded();
  const level = getRevealDegradeLevel();
  listeners.forEach((listener) => listener(level));
}

export function subscribeRevealOomGuard(listener: OomListener): () => void {
  listeners.add(listener);
  if (!subscribed) {
    subscribed = true;
    const appStateAny = AppState as typeof AppState & {
      addEventListener?: (type: string, fn: () => void) => { remove: () => void };
    };
    appStateAny.addEventListener?.("memoryWarning", notifyRevealMemoryWarning);
  }
  return () => listeners.delete(listener);
}

export function resetRevealOomGuardForTests(): void {
  memoryWarningCount = 0;
  listeners.clear();
  subscribed = false;
}
