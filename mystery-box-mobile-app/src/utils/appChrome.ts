import { AppState, Platform, StatusBar as RNStatusBar } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import * as SystemUI from "expo-system-ui";
import { getThemeColors, type ThemeColors } from "../styles/themes";

type AppChromeOptions = {
  colors?: ThemeColors;
  isDark?: boolean;
};

/** 将系统状态栏 / 导航栏刷成与页面一致的背景（Expo Go 与开发包均生效） */
export async function applyAppChrome(options?: AppChromeOptions) {
  const palette = options?.colors ?? getThemeColors("light");
  const isDark = options?.isDark ?? false;
  const barStyle = isDark ? "light-content" : "dark-content";
  const navButtonStyle = isDark ? "light" : "dark";

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
