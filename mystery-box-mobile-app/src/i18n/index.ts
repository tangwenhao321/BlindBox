import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enUS from "./locales/en-US";
import viVN from "./locales/vi-VN";
import zhCN from "./locales/zh-CN";

function resolveInitialLocale(): "zh-CN" | "en-US" | "vi-VN" {
  const envDefault = process.env.EXPO_PUBLIC_DEFAULT_LOCALE?.trim();
  if (envDefault === "vi-VN" || envDefault === "en-US" || envDefault === "zh-CN") {
    return envDefault;
  }
  const deviceTag = getLocales()[0]?.languageTag ?? "en-US";
  if (deviceTag.startsWith("vi")) return "vi-VN";
  if (deviceTag.startsWith("zh")) return "zh-CN";
  return "en-US";
}

const initialLng = resolveInitialLocale();

void i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": { translation: zhCN },
    "en-US": { translation: enUS },
    "vi-VN": { translation: viVN },
  },
  lng: initialLng,
  fallbackLng: "en-US",
  interpolation: { escapeValue: false },
  compatibilityJSON: "v4",
});

export default i18n;
