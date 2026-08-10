import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_SUFFIX_KEY = "reveal_device_ns_v1";

let cachedSuffix = "";

export async function initRevealStorageNamespace(userId?: string | null): Promise<string> {
  let device = await AsyncStorage.getItem(DEVICE_SUFFIX_KEY);
  if (!device) {
    device = `${Platform.OS}-${Date.now().toString(36)}`;
    await AsyncStorage.setItem(DEVICE_SUFFIX_KEY, device);
  }
  cachedSuffix = userId ? `${userId}:${device}` : device;
  return cachedSuffix;
}

export function revealStorageKey(base: string, userId?: string | null): string {
  const ns = cachedSuffix || userId || "guest";
  return `${base}:${ns}`;
}

export function resetRevealStorageNamespaceForTests(): void {
  cachedSuffix = "";
}
