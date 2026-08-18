import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RevealThemeId } from "./revealTheme";
import { canonicalizeRevealThemeId } from "./revealTheme";
import { getRevealRemoteConfig } from "./revealRemote";
import { shouldForceClassicRevealNetwork } from "./revealNetworkTier";
import {
  canonicalizeStoryboardId,
  inferStoryboardFromText,
  type RevealStoryboardId,
} from "./revealStoryboard";
import { getSessionAuthToken } from "../utils/authTokenStore";
import { revealStorageKey } from "../utils/revealStorageNamespace";
import {
  fetchThemeProgress,
  recordThemeProgressOpen,
  saveEquippedThemeRemote,
  type RemoteThemeProgress,
} from "../services/themeProgressService";

export type DocThemeAlias = "adventure" | "cyberpunk" | "asmr" | "party";

/** Weekly rotation order for the four Doc2 themes. */
export const DOC_THEME_ROTATION: DocThemeAlias[] = ["cyberpunk", "adventure", "asmr", "party"];

const UNLOCK_STORAGE_KEY = "reveal_theme_unlocks_v1";
const EQUIPPED_STORAGE_KEY = "reveal_theme_equipped_v1";
const LAST_SEEN_THEME_KEY = "reveal_theme_last_seen_v1";
const OFFICIAL_PREVIEW_KEY = "reveal_theme_official_preview_v1";
const OPENED_ORDERS_KEY = "reveal_theme_unlock_orders_v1";

/** Catalog keys shown in Effects Center (classic + Doc2 packs). */
export type UnlockableThemeKey = "classic" | DocThemeAlias;

export const UNLOCKABLE_THEME_CATALOG: {
  key: UnlockableThemeKey;
  themeId: RevealThemeId;
  remoteAlias: string;
}[] = [
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
const ALL_DOC_UNLOCKED: UnlockableThemeKey[] = ["classic", "asmr", "cyberpunk", "party", "adventure"];

let cachedUnlocks: ThemeUnlockState | null = null;
let cachedEquipped: string | null | undefined = undefined;
let cachedOfficialPreview: boolean | null = null;

export function isTestAppVariant(): boolean {
  return process.env.EXPO_PUBLIC_APP_VARIANT === "test";
}

export function defaultUnlockState(): ThemeUnlockState {
  return {
    unlocked: [...STARTER_UNLOCKED],
    openCount: 0,
    hasHidden: false,
    seriesComplete: false,
  };
}

/** Earned unlocks only (classic + ASMR, then 50 opens / hidden / series). */
export function applyUnlockProgress(
  state: ThemeUnlockState,
  patch: Partial<Pick<ThemeUnlockState, "openCount" | "hasHidden" | "seriesComplete">>,
): ThemeUnlockState {
  const next: ThemeUnlockState = {
    ...state,
    ...patch,
    unlocked: [...STARTER_UNLOCKED],
  };
  if (next.openCount >= 50) next.unlocked.push("cyberpunk");
  if (next.hasHidden) next.unlocked.push("party");
  if (next.seriesComplete) next.unlocked.push("adventure");
  next.unlocked = [...new Set(next.unlocked)];
  return next;
}

function shouldGrantTestThemes(): boolean {
  return isTestAppVariant() && !getCachedOfficialRulesPreview();
}

/** Unlocks shown in UI / used for equip + surprise. Test pack can preview official locks. */
export function effectiveUnlockedKeys(
  state: ThemeUnlockState = getCachedUnlockState(),
  opts?: { grantTestThemes?: boolean },
): UnlockableThemeKey[] {
  const earned = applyUnlockProgress(state, {}).unlocked;
  const grant = opts?.grantTestThemes ?? shouldGrantTestThemes();
  return grant ? [...ALL_DOC_UNLOCKED] : earned;
}

export function unlockedRevealThemeIds(state: ThemeUnlockState = getCachedUnlockState()): RevealThemeId[] {
  const ids = new Set<RevealThemeId>();
  for (const key of effectiveUnlockedKeys(state)) {
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

export function rollSurpriseDocTheme(
  random: () => number = Math.random,
  rate?: number,
  unlockedKeys?: UnlockableThemeKey[],
): DocThemeAlias | null {
  const cfg = getRevealRemoteConfig();
  const trigger = rate ?? cfg.randomTriggerRate ?? 0.05;
  if (random() >= trigger) return null;
  const owned = new Set(unlockedKeys ?? effectiveUnlockedKeys());
  const unowned = DOC_THEME_ROTATION.filter((key) => !owned.has(key));
  const pool = unowned.length > 0 ? unowned : DOC_THEME_ROTATION;
  return pool[Math.floor(random() * pool.length)]!;
}

const surpriseByOrder = new Map<string, DocThemeAlias | null>();

export function rollSurpriseDocThemeForOrder(
  orderId?: string | null,
  random: () => number = Math.random,
): DocThemeAlias | null {
  const key = orderId?.trim();
  if (!key) return rollSurpriseDocTheme(random);
  if (surpriseByOrder.has(key)) return surpriseByOrder.get(key) ?? null;
  const rolled = rollSurpriseDocTheme(random);
  surpriseByOrder.set(key, rolled);
  return rolled;
}

export function rollSurpriseThemeId(
  random: () => number = Math.random,
  rate?: number,
): RevealThemeId | null {
  const pick = rollSurpriseDocTheme(random, rate);
  return pick ? canonicalizeRevealThemeId(pick) : null;
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

/** Same priority as theme rotation, but keeps adventure vs classic distinct. */
export function resolveActiveStoryboardId(opts?: {
  equippedThemeId?: string | null;
  surpriseDocTheme?: DocThemeAlias | null;
  nowMs?: number;
  forceClassic?: boolean;
  categoryName?: string;
  boxName?: string;
}): RevealStoryboardId {
  const cfg = getRevealRemoteConfig();
  if ((cfg.limitedThemePriority ?? 0) > 0 && cfg.limitedThemeId) {
    return canonicalizeStoryboardId(cfg.limitedThemeId);
  }
  const weakNet = opts?.forceClassic === true || shouldForceClassicRevealNetwork();
  if (weakNet) return "classic";
  if (opts?.surpriseDocTheme) {
    return canonicalizeStoryboardId(opts.surpriseDocTheme);
  }
  const equippedRaw = opts?.equippedThemeId ?? getCachedEquippedThemeId();
  if (equippedRaw) {
    return canonicalizeStoryboardId(equippedRaw);
  }
  if (cfg.currentTheme) {
    return canonicalizeStoryboardId(cfg.currentTheme);
  }
  const inferred =
    (opts?.categoryName ? inferStoryboardFromText(opts.categoryName) : null) ??
    (opts?.boxName ? inferStoryboardFromText(opts.boxName) : null);
  if (inferred) return inferred;
  return weeklyDocTheme(opts?.nowMs, cfg.rotationCycle ?? 7);
}

export function getCachedOfficialRulesPreview(): boolean {
  if (cachedOfficialPreview != null) return cachedOfficialPreview;
  return false;
}

export async function loadOfficialRulesPreview(): Promise<boolean> {
  if (!isTestAppVariant()) {
    cachedOfficialPreview = false;
    return false;
  }
  try {
    const raw = await AsyncStorage.getItem(OFFICIAL_PREVIEW_KEY);
    cachedOfficialPreview = raw === "1";
    return cachedOfficialPreview;
  } catch {
    cachedOfficialPreview = false;
    return false;
  }
}

export async function setOfficialRulesPreview(enabled: boolean): Promise<boolean> {
  cachedOfficialPreview = !!enabled;
  await AsyncStorage.setItem(OFFICIAL_PREVIEW_KEY, cachedOfficialPreview ? "1" : "0");
  return cachedOfficialPreview;
}

function unlockStorageKey(): string {
  return revealStorageKey(UNLOCK_STORAGE_KEY);
}

function equippedStorageKey(): string {
  return revealStorageKey(EQUIPPED_STORAGE_KEY);
}

function openedOrdersStorageKey(): string {
  return revealStorageKey(OPENED_ORDERS_KEY);
}

function mergeRemoteProgress(local: ThemeUnlockState, remote: RemoteThemeProgress): ThemeUnlockState {
  return applyUnlockProgress(local, {
    openCount: Math.max(local.openCount, remote.openCount),
    hasHidden: local.hasHidden || remote.hasHidden,
    seriesComplete: local.seriesComplete || remote.seriesComplete,
  });
}

export function getCachedUnlockState(): ThemeUnlockState {
  return cachedUnlocks ?? defaultUnlockState();
}

export function getCachedEquippedThemeId(): string | null {
  return cachedEquipped === undefined ? null : cachedEquipped;
}

async function readUnlockStateRaw(): Promise<ThemeUnlockState> {
  try {
    const raw =
      (await AsyncStorage.getItem(unlockStorageKey())) ??
      (await AsyncStorage.getItem(UNLOCK_STORAGE_KEY));
    if (!raw) {
      return defaultUnlockState();
    }
    const parsed = JSON.parse(raw) as Partial<ThemeUnlockState>;
    return applyUnlockProgress(
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
  } catch {
    return defaultUnlockState();
  }
}

export async function loadThemeUnlockState(): Promise<ThemeUnlockState> {
  await loadOfficialRulesPreview();
  let next = await readUnlockStateRaw();
  const token = getSessionAuthToken();
  if (token) {
    const remote = await fetchThemeProgress(token);
    if (remote) {
      next = mergeRemoteProgress(next, remote);
      if (remote.equippedThemeId) {
        cachedEquipped = remote.equippedThemeId;
        await AsyncStorage.setItem(equippedStorageKey(), remote.equippedThemeId);
      }
    }
  }
  cachedUnlocks = next;
  await AsyncStorage.setItem(unlockStorageKey(), JSON.stringify(next));
  return next;
}

export async function saveThemeUnlockState(state: ThemeUnlockState): Promise<ThemeUnlockState> {
  const next = applyUnlockProgress(state, {});
  cachedUnlocks = next;
  await AsyncStorage.setItem(unlockStorageKey(), JSON.stringify(next));
  return next;
}

export async function recordThemeUnlockProgress(
  patch: Partial<Pick<ThemeUnlockState, "openCount" | "hasHidden" | "seriesComplete">>,
): Promise<ThemeUnlockState> {
  const current = await loadThemeUnlockState();
  return saveThemeUnlockState(applyUnlockProgress(current, patch));
}

let cachedOpenedOrders: string[] | null = null;

async function loadOpenedOrderIds(): Promise<string[]> {
  if (cachedOpenedOrders) return cachedOpenedOrders;
  try {
    const raw =
      (await AsyncStorage.getItem(openedOrdersStorageKey())) ??
      (await AsyncStorage.getItem(OPENED_ORDERS_KEY));
    if (!raw) {
      cachedOpenedOrders = [];
      return cachedOpenedOrders;
    }
    const parsed = JSON.parse(raw) as unknown;
    cachedOpenedOrders = Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
    return cachedOpenedOrders;
  } catch {
    cachedOpenedOrders = [];
    return cachedOpenedOrders;
  }
}

export type BoxOpenedUnlockResult = {
  state: ThemeUnlockState;
  newlyUnlocked: UnlockableThemeKey[];
  isNewOpen: boolean;
};

/** Count a paid unbox once per order; unlock cyberpunk / party / adventure from real progress. */
export async function notePaidBoxOpened(opts: {
  orderId: string;
  hasHidden?: boolean;
  seriesComplete?: boolean;
}): Promise<BoxOpenedUnlockResult> {
  const orderId = opts.orderId.trim();
  const current = await loadThemeUnlockState();
  const seen = await loadOpenedOrderIds();
  const isNewOpen = !!orderId && !seen.includes(orderId);
  const prevUnlocked = new Set(current.unlocked);
  let next = await saveThemeUnlockState(
    applyUnlockProgress(current, {
      openCount: isNewOpen ? current.openCount + 1 : current.openCount,
      hasHidden: current.hasHidden || !!opts.hasHidden,
      seriesComplete: current.seriesComplete || !!opts.seriesComplete,
    }),
  );
  if (isNewOpen) {
    cachedOpenedOrders = [...seen, orderId].slice(-240);
    await AsyncStorage.setItem(openedOrdersStorageKey(), JSON.stringify(cachedOpenedOrders));
  }
  const token = getSessionAuthToken();
  if (token && orderId) {
    const remote = await recordThemeProgressOpen(token, orderId, {
      hasHidden: !!opts.hasHidden,
      seriesComplete: !!opts.seriesComplete,
    });
    if (remote) {
      next = await saveThemeUnlockState(mergeRemoteProgress(next, remote));
    }
  }
  return {
    state: next,
    newlyUnlocked: next.unlocked.filter((key) => !prevUnlocked.has(key)),
    isNewOpen,
  };
}

export async function loadEquippedThemeId(): Promise<string | null> {
  try {
    const raw =
      (await AsyncStorage.getItem(equippedStorageKey())) ??
      (await AsyncStorage.getItem(EQUIPPED_STORAGE_KEY));
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
    await AsyncStorage.removeItem(equippedStorageKey());
  } else {
    await AsyncStorage.setItem(equippedStorageKey(), cachedEquipped);
  }
  const token = getSessionAuthToken();
  if (token) {
    void saveEquippedThemeRemote(token, cachedEquipped);
  }
}

export function resetThemeRotationCacheForTests(): void {
  cachedUnlocks = null;
  cachedEquipped = undefined;
  surpriseByOrder.clear();
  cachedOpenedOrders = null;
  cachedOfficialPreview = null;
}

export const themeStorageKeys = {
  unlocks: UNLOCK_STORAGE_KEY,
  equipped: EQUIPPED_STORAGE_KEY,
  lastSeen: LAST_SEEN_THEME_KEY,
};
