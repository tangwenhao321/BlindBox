import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_PHONE_KEY = "auth:lastPhone";

export async function readLastLoginPhone(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(LAST_PHONE_KEY);
    return value?.trim() || null;
  } catch {
    return null;
  }
}

export async function writeLastLoginPhone(phone: string): Promise<void> {
  const trimmed = phone.trim();
  if (!trimmed) return;
  try {
    await AsyncStorage.setItem(LAST_PHONE_KEY, trimmed);
  } catch {
    // ignore storage failures
  }
}

export async function clearLastLoginPhone(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LAST_PHONE_KEY);
  } catch {
    // ignore
  }
}
