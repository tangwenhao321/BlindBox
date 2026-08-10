import AsyncStorage from "@react-native-async-storage/async-storage";
import { revealStorageKey } from "../utils/revealStorageNamespace";

const KEY = "calendar_stamps";

export function revealStampDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export async function recordDailyFirstRevealStamp(orderId: string, day = revealStampDayKey()): Promise<boolean> {
  const storageKey = revealStorageKey(`${KEY}:${day}`);
  const existing = await AsyncStorage.getItem(storageKey);
  if (existing) return false;
  await AsyncStorage.setItem(storageKey, JSON.stringify({ orderId, stampedAt: Date.now() }));
  return true;
}

export async function hasDailyRevealStamp(day = revealStampDayKey()): Promise<boolean> {
  const raw = await AsyncStorage.getItem(revealStorageKey(`${KEY}:${day}`));
  return !!raw;
}

export async function getDailyRevealStamp(day = revealStampDayKey()): Promise<{ orderId: string; stampedAt: number } | null> {
  const raw = await AsyncStorage.getItem(revealStorageKey(`${KEY}:${day}`));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { orderId: string; stampedAt: number };
  } catch {
    return null;
  }
}
