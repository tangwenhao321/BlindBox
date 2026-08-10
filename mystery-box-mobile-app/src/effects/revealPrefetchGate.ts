import { getRevealDegradeLevel } from "./sessionPerf";
import { isRevealWeakNetworkMode } from "./revealWeakNetwork";

let prefetchAllowed = true;
let lastFpsHealthy = true;

export function setRevealPrefetchFpsHealthy(healthy: boolean): void {
  lastFpsHealthy = healthy;
}

export function setRevealPrefetchAllowed(allowed: boolean): void {
  prefetchAllowed = allowed;
}

/** WiFi + stable FPS gate for heavy reveal asset prefetch. */
export function shouldAllowRevealPrefetch(networkType?: string | null): boolean {
  if (!prefetchAllowed) return false;
  if (isRevealWeakNetworkMode()) return false;
  const type = (networkType ?? "unknown").toLowerCase();
  if (type && type !== "wifi" && type !== "unknown" && type !== "ethernet") return false;
  if (!lastFpsHealthy) return false;
  return getRevealDegradeLevel() < 1;
}
