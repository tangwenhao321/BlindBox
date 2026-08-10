import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppPublicConfig } from "../services/appConfigService";

const CACHE_KEY = "app_public_config_v1";

export async function readCachedPublicConfig(): Promise<AppPublicConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppPublicConfig;
  } catch {
    return null;
  }
}

export async function writeCachedPublicConfig(config: AppPublicConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(config));
  } catch {
    // Ignore cache write failures.
  }
}
