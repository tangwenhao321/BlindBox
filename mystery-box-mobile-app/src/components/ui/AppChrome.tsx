import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { useAppTheme } from "../../context/ThemeContext";
import { applyAppChrome, subscribeAppChromeOnResume } from "../../utils/appChrome";

/** 统一状态栏 / 系统导航栏背景，避免 Expo Go 顶部与底部黑条 */
export function AppChrome() {
  const { colors, isDark } = useAppTheme();

  useEffect(() => {
    void applyAppChrome({ colors, isDark });
    const unsubscribe = subscribeAppChromeOnResume({ colors, isDark });
    return unsubscribe;
  }, [colors, isDark]);

  return <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.bgPage} />;
}
