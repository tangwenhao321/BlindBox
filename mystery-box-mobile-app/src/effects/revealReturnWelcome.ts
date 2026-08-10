import AsyncStorage from "@react-native-async-storage/async-storage";
import { revealStorageKey } from "../utils/revealStorageNamespace";

const KEY_LAST_ACTIVE = "return_welcome_last_active";
const KEY_SHOWN_AT = "return_welcome_shown_at";
const RETURN_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

export async function recordLastActiveAt(at = Date.now()): Promise<void> {
  await AsyncStorage.setItem(revealStorageKey(KEY_LAST_ACTIVE), String(at));
}

export async function shouldShowReturnWelcome(now = Date.now()): Promise<boolean> {
  const raw = await AsyncStorage.getItem(revealStorageKey(KEY_LAST_ACTIVE));
  if (!raw) return false;
  const lastActive = Number(raw);
  if (!Number.isFinite(lastActive)) return false;
  if (now - lastActive < RETURN_THRESHOLD_MS) return false;
  const shownRaw = await AsyncStorage.getItem(revealStorageKey(KEY_SHOWN_AT));
  if (shownRaw) {
    const shownAt = Number(shownRaw);
    if (Number.isFinite(shownAt) && shownAt >= lastActive) return false;
  }
  return true;
}

export async function markReturnWelcomeShown(at = Date.now()): Promise<void> {
  await AsyncStorage.setItem(revealStorageKey(KEY_SHOWN_AT), String(at));
  await recordLastActiveAt(at);
}
