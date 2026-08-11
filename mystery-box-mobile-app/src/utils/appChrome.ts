import { AppState, Platform, StatusBar as RNStatusBar } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import * as SystemUI from "expo-system-ui";
import { getThemeColors, type ThemeColors } from "../styles/themes";

type AppChromeOptions = {
  colors?: ThemeColors;
  isDark?: boolean;
};

function isDarkSurface(hex: string): boolean {
  const raw = hex.replace("#", "");
  if (raw.length < 6) return true;
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.35;
}

/** 将系统状态栏 / 导航栏刷成与页面一致的背景（Expo Go 与开发包均生效） */
export async function applyAppChrome(options?: AppChromeOptions) {
  const palette = options?.colors ?? getThemeColors("dark");
  // Cabinet surfaces are warm ink — use light system icons when page is dark.
  const darkShell = isDarkSurface(palette.bgPage) || Boolean(options?.isDark);
  const barStyle = darkShell ? "light-content" : "dark-content";
  const navButtonStyle = darkShell ? "light" : "dark";

  await SystemUI.setBackgroundColorAsync(palette.bgPage);
  if (Platform.OS === "android") {
    RNStatusBar.setTranslucent(false);
    RNStatusBar.setBackgroundColor(palette.bgPage);
    RNStatusBar.setBarStyle(barStyle);
    await NavigationBar.setBackgroundColorAsync(palette.bgPage);
    await NavigationBar.setButtonStyleAsync(navButtonStyle);
  }
}

export function subscribeAppChromeOnResume(options?: AppChromeOptions) {
  const sub = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      void applyAppChrome(options);
    }
  });
  return () => sub.remove();
}
