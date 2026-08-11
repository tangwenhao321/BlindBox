import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RevealThemeId } from "./revealTheme";
import { canonicalizeRevealThemeId } from "./revealTheme";
import { getRevealRemoteConfig } from "./revealRemote";
import { shouldForceClassicRevealNetwork } from "./revealNetworkTier";

export type DocThemeAlias = "adventure" | "cyberpunk" | "asmr" | "party";

/** Weekly rotation order for the four Doc2 themes. */
export const DOC_THEME_ROTATION: DocThemeAlias[] = ["cyberpunk", "adventure", "asmr", "party"];

const UNLOCK_STORAGE_KEY = "reveal_theme_unlocks_v1";
const EQUIPPED_STORAGE_KEY = "reveal_theme_equipped_v1";
const LAST_SEEN_THEME_KEY = "reveal_theme_last_seen_v1";

/** Catalog keys shown in Effects Center (classic + Doc2 packs). */
export type UnlockableThemeKey = "classic" | DocThemeAlias;

export const UNLOCKABLE_THEME_CATALOG: Array<{
  key: UnlockableThemeKey;
  themeId: RevealThemeId;
  remoteAlias: string;
}> = [
  { key: "classic", themeId: "default", remoteAlias: "default" },
  { key: "asmr", themeId: "cute", remoteAlias: "asmr" },
  { key: "cyberpunk", themeId: "neon", remoteAlias: "cyberpunk" },
  { key: "party", themeId: "luxury", remoteAlias: "party" },
  { key: "adventure", themeId: "default", remoteAlias: "adventure" },
];

export type ThemeUnlockState = {
  unlocked: UnlockableThemeKey[];
  openCount: number;
  hasHidden: boolean;
  seriesComplete: boolean;
};

const STARTER_UNLOCKED: UnlockableThemeKey[] = ["classic", "asmr"];

let cachedUnlocks: ThemeUnlockState | null = null;
let cachedEquipped: string | null | undefined = undefined;

export function defaultUnlockState(): ThemeUnlockState {
  return {
    unlocked: [...STARTER_UNLOCKED],
    openCount: 0,
    hasHidden: false,
    seriesComplete: false,
  };
}

export function applyUnlockProgress(
  state: ThemeUnlockState,
  patch: Partial<Pick<ThemeUnlockState, "openCount" | "hasHidden" | "seriesComplete">>,
): ThemeUnlockState {
  const next: ThemeUnlockState = {
    ...state,
    ...patch,
    unlocked: [...new Set(state.unlocked)],
  };
  if (!next.unlocked.includes("classic")) next.unlocked.push("classic");
  if (!next.unlocked.includes("asmr")) next.unlocked.push("asmr");
  if (next.openCount >= 50 && !next.unlocked.includes("cyberpunk")) {
    next.unlocked.push("cyberpunk");
  }
  if (next.hasHidden && !next.unlocked.includes("party")) {
    next.unlocked.push("party");
  }
  if (next.seriesComplete && !next.unlocked.includes("adventure")) {
    next.unlocked.push("adventure");
  }
  return next;
}

export function unlockedRevealThemeIds(state: ThemeUnlockState = getCachedUnlockState()): RevealThemeId[] {
  const ids = new Set<RevealThemeId>();
  for (const key of state.unlocked) {
    const row = UNLOCKABLE_THEME_CATALOG.find((item) => item.key === key);
    if (row) ids.add(row.themeId);
  }
  ids.add("default");
  ids.add("cute");
  return [...ids];
}

export function weekIndex(nowMs = Date.now(), cycleDays = 7): number {
  const days = Math.floor(nowMs / (24 * 60 * 60 * 1000));
  const cycle = Math.max(1, cycleDays);
  return Math.floor(days / cycle);
}

export function weeklyDocTheme(nowMs = Date.now(), cycleDays = 7): DocThemeAlias {
  const idx = weekIndex(nowMs, cycleDays) % DOC_THEME_ROTATION.length;
  return DOC_THEME_ROTATION[idx]!;
}

export function rollSurpriseThemeId(
  random: () => number = Math.random,
  rate?: number,
): RevealThemeId | null {
  const cfg = getRevealRemoteConfig();
  const trigger = rate ?? cfg.randomTriggerRate ?? 0.05;
  if (random() >= trigger) return null;
  const pick = DOC_THEME_ROTATION[Math.floor(random() * DOC_THEME_ROTATION.length)]!;
  return canonicalizeRevealThemeId(pick);
}

/**
 * Festival/limited → equipped unlocked → weekly (currentTheme / cycle) → default.
 * Weak-net (RTT>300) forces classic unless limited/festival is active.
 */
export function resolveActiveRevealThemeId(opts?: {
  equippedThemeId?: string | null;
  unlocked?: RevealThemeId[];
  unlockedKeys?: UnlockableThemeKey[];
  surpriseThemeId?: RevealThemeId | null;
  nowMs?: number;
  forceClassic?: boolean;
}): RevealThemeId {
  const cfg = getRevealRemoteConfig();
  const limitedActive = (cfg.limitedThemePriority ?? 0) > 0 && !!cfg.limitedThemeId;
  if (limitedActive) {
    return canonicalizeRevealThemeId(cfg.limitedThemeId);
  }

  const weakNet = opts?.forceClassic === true || shouldForceClassicRevealNetwork();
  if (weakNet) {
    return "default";
  }

  if (opts?.surpriseThemeId) {
    return opts.surpriseThemeId;
  }

  const equippedRaw = opts?.equippedThemeId ?? getCachedEquippedThemeId();
  const unlockedIds = opts?.unlocked ?? unlockedRevealThemeIds(getCachedUnlockState());
  if (equippedRaw) {
    const equipped = canonicalizeRevealThemeId(equippedRaw);
    if (unlockedIds.includes(equipped)) {
      return equipped;
    }
  }

  if (cfg.currentTheme) {
    return canonicalizeRevealThemeId(cfg.currentTheme);
  }

  const weekly = weeklyDocTheme(opts?.nowMs, cfg.rotationCycle ?? 7);
  return canonicalizeRevealThemeId(weekly);
}

export function getCachedUnlockState(): ThemeUnlockState {
  return cachedUnlocks ?? defaultUnlockState();
}

export function getCachedEquippedThemeId(): string | null {
  return cachedEquipped === undefined ? null : cachedEquipped;
}

export async function loadThemeUnlockState(): Promise<ThemeUnlockState> {
  try {
    const raw = await AsyncStorage.getItem(UNLOCK_STORAGE_KEY);
    if (!raw) {
      cachedUnlocks = defaultUnlockState();
      return cachedUnlocks;
    }
    const parsed = JSON.parse(raw) as Partial<ThemeUnlockState>;
    cachedUnlocks = applyUnlockProgress(
      {
        ...defaultUnlockState(),
        unlocked: Array.isArray(parsed.unlocked)
          ? (parsed.unlocked.filter(Boolean) as UnlockableThemeKey[])
          : STARTER_UNLOCKED,
        openCount: Number(parsed.openCount ?? 0) || 0,
        hasHidden: !!parsed.hasHidden,
        seriesComplete: !!parsed.seriesComplete,
      },
      {},
    );
    return cachedUnlocks;
  } catch {
    cachedUnlocks = defaultUnlockState();
    return cachedUnlocks;
  }
}

export async function saveThemeUnlockState(state: ThemeUnlockState): Promise<ThemeUnlockState> {
  const next = applyUnlockProgress(state, {});
  cachedUnlocks = next;
  await AsyncStorage.setItem(UNLOCK_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function recordThemeUnlockProgress(
  patch: Partial<Pick<ThemeUnlockState, "openCount" | "hasHidden" | "seriesComplete">>,
): Promise<ThemeUnlockState> {
  const current = await loadThemeUnlockState();
  return saveThemeUnlockState(applyUnlockProgress(current, patch));
}

export async function loadEquippedThemeId(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(EQUIPPED_STORAGE_KEY);
    cachedEquipped = raw?.trim() || null;
    return cachedEquipped;
  } catch {
    cachedEquipped = null;
    return null;
  }
}

export async function setEquippedThemeId(id: string | null): Promise<void> {
  cachedEquipped = id?.trim() || null;
  if (!cachedEquipped) {
    await AsyncStorage.removeItem(EQUIPPED_STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(EQUIPPED_STORAGE_KEY, cachedEquipped);
}

export function resetThemeRotationCacheForTests(): void {
  cachedUnlocks = null;
  cachedEquipped = undefined;
}

export const themeStorageKeys = {
  unlocks: UNLOCK_STORAGE_KEY,
  equipped: EQUIPPED_STORAGE_KEY,
  lastSeen: LAST_SEEN_THEME_KEY,
};
