import { cancelAnimation, type SharedValue } from "react-native-reanimated";
import { getRevealDegradeLevel } from "./sessionPerf";
import { getRevealRemoteConfig } from "./revealRemote";
import { isRevealWeakNetworkMode } from "./revealWeakNetwork";
import { trackEffectEvent } from "./telemetry";
import { loadFestivalTemplateAssets } from "./revealFestivalBundle";
export {
  setRevealPrefetchAllowed,
  setRevealPrefetchFpsHealthy,
  shouldAllowRevealPrefetch,
} from "./revealPrefetchGate";

type ManagedValues = SharedValue<number>[];

const activeKeys = new Set<string>();
const lruReleaseAt = new Map<string, number>();
const LRU_MS = 30_000;
let cachedFestivalTemplateId: string | undefined;

export { setRevealWeakNetworkMode, isRevealWeakNetworkMode } from "./revealWeakNetwork";

export function resolveRevealAssetParticleScale(base: number): number {
  return isRevealWeakNetworkMode() ? Math.round(base * 0.72) : base;
}

export function syncFestivalTemplateCache(templateId?: string): void {
  const remote = getRevealRemoteConfig();
  const next = templateId ?? remote.festivalTemplateId;
  if (cachedFestivalTemplateId && cachedFestivalTemplateId !== next) {
    trackEffectEvent("reveal_festival_cache_purge", { from: cachedFestivalTemplateId, to: next ?? "none" });
  }
  cachedFestivalTemplateId = next;
  if (next) void loadFestivalTemplateAssets(next);
}

export function markRevealDrawActive(orderId: string, revealIndex: number): string {
  const key = `${orderId}:${revealIndex}`;
  activeKeys.add(key);
  return key;
}

export function releaseRevealDraw(key: string): void {
  activeKeys.delete(key);
  lruReleaseAt.delete(key);
}

export function scheduleRevealDrawRelease(key: string, immediate = false): void {
  if (immediate || getRevealDegradeLevel() >= 1) {
    releaseRevealDraw(key);
    return;
  }
  lruReleaseAt.set(key, Date.now() + LRU_MS);
}

export function flushExpiredRevealDraws(now = Date.now()): void {
  lruReleaseAt.forEach((expiresAt, key) => {
    if (now >= expiresAt) {
      releaseRevealDraw(key);
    }
  });
}

export function cancelRevealMotion(values: ManagedValues): void {
  values.forEach((v) => cancelAnimation(v));
}

export function getActiveRevealDrawCount(): number {
  return activeKeys.size;
}
