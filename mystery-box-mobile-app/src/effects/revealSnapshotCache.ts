import AsyncStorage from "@react-native-async-storage/async-storage";

import { canGuestSaveSnapshot, notifyGuestRevealBlocked } from "./revealGuestPolicy";

const KEY_PREFIX = "reveal_snapshot_v1:";

export type RevealSnapshotTag =
  | "LEGENDARY"
  | "HIDDEN"
  | "LIMITED"
  | "FESTIVAL"
  | "GENERAL"
  | "DISCONTINUED"
  | "EVENT_LIMITED";

export type RevealSnapshot = {
  orderId: string;
  productId: string;
  productName?: string;
  imageUri?: string;
  qualityType?: string;
  capturedAt: number;
  tags?: RevealSnapshotTag[];
};

export function deriveSnapshotTags(
  tier: string,
  limitedThemeActive = false,
  qualityType?: string,
): RevealSnapshotTag[] {
  const tags: RevealSnapshotTag[] = [];
  if (tier === "LEGENDARY" || tier === "TREASURE_LEGEND") tags.push("LEGENDARY");
  else if (tier === "HIDDEN") tags.push("HIDDEN");
  else tags.push("GENERAL");
  if (limitedThemeActive) tags.push("LIMITED");
  const qt = (qualityType ?? "").toUpperCase();
  if (qt.includes("DISCONTINUED") || qt.includes("OFF_SHELF")) tags.push("DISCONTINUED");
  if (qt.includes("EVENT") || qt.includes("LIMITED_RUN")) tags.push("EVENT_LIMITED");
  return tags;
}

export async function listRevealSnapshotsByTag(tag: RevealSnapshotTag, limit = 20): Promise<RevealSnapshot[]> {
  const all = await listRecentRevealSnapshots(100);
  return all.filter((s) => s.tags?.includes(tag)).slice(0, limit);
}

export async function saveRevealSnapshot(snapshot: RevealSnapshot, hasAuth = true): Promise<boolean> {
  if (!canGuestSaveSnapshot(hasAuth)) {
    notifyGuestRevealBlocked("snapshot");
    return false;
  }
  const key = `${KEY_PREFIX}${snapshot.orderId}:${snapshot.productId}`;
  await AsyncStorage.setItem(key, JSON.stringify(snapshot));
  return true;
}

export async function loadRevealSnapshot(
  orderId: string,
  productId: string,
): Promise<RevealSnapshot | null> {
  const raw = await AsyncStorage.getItem(`${KEY_PREFIX}${orderId}:${productId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RevealSnapshot;
  } catch {
    return null;
  }
}

export async function listRecentRevealSnapshots(limit = 5): Promise<RevealSnapshot[]> {
  const keys = await AsyncStorage.getAllKeys();
  const snapKeys = keys.filter((k) => k.startsWith(KEY_PREFIX));
  const rows = await AsyncStorage.multiGet(snapKeys);
  const parsed = rows
    .map(([, v]) => {
      try {
        return v ? (JSON.parse(v) as RevealSnapshot) : null;
      } catch {
        return null;
      }
    })
    .filter((v): v is RevealSnapshot => !!v)
    .sort((a, b) => b.capturedAt - a.capturedAt);
  return parsed.slice(0, limit);
}

export async function pruneSnapshots(maxAgeMs = 7 * 24 * 60 * 60 * 1000): Promise<number> {
  const keys = await AsyncStorage.getAllKeys();
  const snapKeys = keys.filter((k) => k.startsWith(KEY_PREFIX));
  const rows = await AsyncStorage.multiGet(snapKeys);
  const cutoff = Date.now() - maxAgeMs;
  const stale: string[] = [];
  for (const [key, raw] of rows) {
    try {
      const snap = raw ? (JSON.parse(raw) as RevealSnapshot) : null;
      if (snap && snap.capturedAt < cutoff) stale.push(key);
    } catch {
      stale.push(key);
    }
  }
  if (stale.length) await AsyncStorage.multiRemove(stale);
  return stale.length;
}

export async function clearSnapshotCache(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const snapKeys = keys.filter((k) => k.startsWith(KEY_PREFIX));
  if (snapKeys.length) await AsyncStorage.multiRemove(snapKeys);
}
