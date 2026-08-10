import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ThemeMode } from "../styles/themes";

const THEME_KEY = "app_theme_mode_v1";

export async function getStoredThemeMode(): Promise<ThemeMode | null> {
  const raw = await AsyncStorage.getItem(THEME_KEY);
  return raw === "dark" || raw === "light" || raw === "system" ? raw : null;
}

export async function setStoredThemeMode(mode: ThemeMode): Promise<void> {
  await AsyncStorage.setItem(THEME_KEY, mode);
}
