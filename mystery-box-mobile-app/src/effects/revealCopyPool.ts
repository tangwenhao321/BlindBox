import type { RevealPacing } from "./revealSequence";
import type { CeremonyTier } from "./ceremonyTier";
import { isUltimateCeremony, resolveCeremonyTier } from "./ceremonyTier";
import type { Product } from "../types";

export type CopyLengthBucket = "short" | "normal" | "long";

export type CopyPoolTier = "general" | "rare" | "finale" | "ultimate" | "dryStreak";

export const DRY_STREAK_POOL_PREFIX = "dryStreak";

export function resolveCopyLengthBucket(holdMs: number): CopyLengthBucket {
  if (holdMs < 900) return "short";
  if (holdMs > 2200) return "long";
  return "normal";
}

export function resolveCopyPoolPrefix(bucket: CopyLengthBucket, basePrefix: string): string {
  if (bucket === "short") return `progressShort_${basePrefix}`;
  if (bucket === "long") return `progressLong_${basePrefix}`;
  return basePrefix;
}


export function resolveCopyPoolTier(
  ceremony: CeremonyTier | undefined,
  pacing: RevealPacing,
  dryStreakCount = 0,
): CopyPoolTier {
  if (dryStreakCount >= 3) return "dryStreak";
  if (ceremony && isUltimateCeremony(ceremony)) return "ultimate";
  if (pacing === "finale" || pacing === "ceremony") return "finale";
  if (ceremony === "HIDDEN" || ceremony === "TREASURE_LEGEND") return "rare";
  return "general";
}

export function countDryStreakReveals(revealed: Product[], all: Product[]): number {
  let streak = 0;
  for (let i = revealed.length - 1; i >= 0; i -= 1) {
    const product = revealed[i];
    if (!product) break;
    const tier = resolveCeremonyTier(product, all.length ? all : revealed);
    if (tier === "GENERAL") streak += 1;
    else break;
  }
  return streak;
}

export function resolveDryStreakCopyPoolPrefix(bucket: CopyLengthBucket): string {
  if (bucket === "short") return `progressShort_${DRY_STREAK_POOL_PREFIX}`;
  if (bucket === "long") return `progressLong_${DRY_STREAK_POOL_PREFIX}`;
  return DRY_STREAK_POOL_PREFIX;
}

/** Pick a stable-random key from a pool using order + index seed. */
const recentCopyKeys: string[] = [];
const seedCache = new Map<string, string>();
const copyKeyCooldownAt = new Map<string, number>();
const sessionOrderCopyKeys = new Map<string, Set<string>>();
const MAX_RECENT = 8;
export const COPY_POOL_COOLDOWN_MS = 180_000;

export function pickCopyPoolKey(
  poolPrefix: string,
  poolSize: number,
  seed: string,
): string {
  if (poolSize <= 1) return `${poolPrefix}0`;
  const cached = seedCache.get(`${poolPrefix}:${seed}`);
  if (cached) return cached;
  const hash = hashSeed(seed);
  const now = Date.now();
  const orderKey = seed.split(":")[0] ?? seed;
  const sessionUsed = sessionOrderCopyKeys.get(orderKey) ?? new Set<string>();
  const preferred = `${poolPrefix}${hash % poolSize}`;
  let picked = preferred;
  const isOnCooldown = (key: string) => {
    const last = copyKeyCooldownAt.get(key);
    return last != null && now - last < COPY_POOL_COOLDOWN_MS;
  };
  if (recentCopyKeys.includes(preferred) || isOnCooldown(preferred) || sessionUsed.has(preferred)) {
    for (let attempt = 1; attempt < poolSize; attempt += 1) {
      const key = `${poolPrefix}${(hash + attempt) % poolSize}`;
      if (!recentCopyKeys.includes(key) && !isOnCooldown(key) && !sessionUsed.has(key)) {
        picked = key;
        break;
      }
    }
  }
  pushRecentCopyKey(picked);
  copyKeyCooldownAt.set(picked, now);
  sessionUsed.add(picked);
  sessionOrderCopyKeys.set(orderKey, sessionUsed);
  seedCache.set(`${poolPrefix}:${seed}`, picked);
  return picked;
}

function pushRecentCopyKey(key: string): void {
  recentCopyKeys.unshift(key);
  if (recentCopyKeys.length > MAX_RECENT) recentCopyKeys.pop();
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function resetCopyPoolRecentForTests(): void {
  recentCopyKeys.length = 0;
  seedCache.clear();
  copyKeyCooldownAt.clear();
  sessionOrderCopyKeys.clear();
}
