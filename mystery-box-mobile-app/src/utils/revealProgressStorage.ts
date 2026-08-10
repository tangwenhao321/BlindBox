import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RevealProgressSnapshot } from "../effects/revealOrchestrator";
import { revealStorageKey } from "./revealStorageNamespace";

const STORAGE_BASE = "reveal_progress_v1";

function storageKey(): string {
  return revealStorageKey(STORAGE_BASE);
}

export type RevealProgressRecord = RevealProgressSnapshot & {
  pausedAtIndex?: number;
};

export async function saveRevealProgress(snapshot: RevealProgressSnapshot, pausedAtIndex?: number): Promise<void> {
  try {
    const record: RevealProgressRecord = pausedAtIndex != null ? { ...snapshot, pausedAtIndex } : snapshot;
    await AsyncStorage.setItem(storageKey(), JSON.stringify(record));
  } catch {
    // ignore persistence failures
  }
}

export async function loadRevealProgress(orderId: string): Promise<RevealProgressRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RevealProgressRecord;
    if (parsed.orderId !== orderId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearRevealProgress(orderId?: string): Promise<void> {
  try {
    if (!orderId) {
      await AsyncStorage.removeItem(storageKey());
      return;
    }
    const existing = await loadRevealProgress(orderId);
    if (existing) await AsyncStorage.removeItem(storageKey());
  } catch {
    // ignore
  }
}
