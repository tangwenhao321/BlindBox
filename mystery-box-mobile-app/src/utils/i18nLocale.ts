import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import i18n from "../i18n";

const LOCALE_KEY = "app_locale_v1";
export type AppLocale = "zh-CN" | "en-US" | "vi-VN";

function resolveEnvDefaultLocale(): AppLocale | null {
  const envDefault = process.env.EXPO_PUBLIC_DEFAULT_LOCALE?.trim();
  return envDefault === "en-US" || envDefault === "zh-CN" || envDefault === "vi-VN" ? envDefault : null;
}

function resolveDeviceLocale(): AppLocale {
  const deviceTag = getLocales()[0]?.languageTag ?? "en-US";
  if (deviceTag.startsWith("vi")) return "vi-VN";
  if (deviceTag.startsWith("en")) return "en-US";
  if (deviceTag.startsWith("zh")) return "zh-CN";
  return resolveEnvDefaultLocale() ?? "vi-VN";
}

export function resolveAppLocale(language?: string | null): AppLocale {
  const lang = language ?? i18n.language ?? resolveDeviceLocale();
  if (lang.startsWith("vi")) return "vi-VN";
  if (lang.startsWith("en")) return "en-US";
  return "zh-CN";
}

export function getAppLocale(): AppLocale {
  return resolveAppLocale(i18n.language);
}

export async function getStoredLocale(): Promise<AppLocale | null> {
  const raw = await AsyncStorage.getItem(LOCALE_KEY);
  return raw === "en-US" || raw === "zh-CN" || raw === "vi-VN" ? raw : null;
}

export async function setAppLocale(locale: AppLocale): Promise<void> {
  await AsyncStorage.setItem(LOCALE_KEY, locale);
  await i18n.changeLanguage(locale);
}

export async function hydrateAppLocale(): Promise<void> {
  const stored = await getStoredLocale();
  if (stored) {
    await i18n.changeLanguage(stored);
    return;
  }
  const envDefault = resolveEnvDefaultLocale();
  if (envDefault) await i18n.changeLanguage(envDefault);
}
