import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { getThemeColors, resolveThemeMode, type ThemeColors, type ThemeMode } from "../styles/themes";
import { getStoredThemeMode, setStoredThemeMode } from "../utils/themeStorage";

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  colors: ThemeColors;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleDark: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  /** Brand default: night cabinet; light = day cabinet (bright stall wood + paper). */
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    void getStoredThemeMode().then((stored) => {
      if (stored) setModeState(stored);
    });
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void setStoredThemeMode(next);
  }, []);

  const toggleDark = useCallback(() => {
    setModeState((prev) => {
      const resolved = resolveThemeMode(prev, systemScheme);
      const next: ThemeMode = resolved === "dark" ? "light" : "dark";
      void setStoredThemeMode(next);
      return next;
    });
  }, [systemScheme]);

  const resolvedMode = resolveThemeMode(mode, systemScheme);

  const value = useMemo(
    () => ({
      mode,
      resolvedMode,
      colors: getThemeColors(resolvedMode),
      isDark: resolvedMode === "dark",
      setMode,
      toggleDark,
    }),
    [mode, resolvedMode, setMode, toggleDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    const resolvedMode = "dark" as const;
    return {
      mode: "dark",
      resolvedMode,
      colors: getThemeColors(resolvedMode),
      isDark: true,
      setMode: () => undefined,
      toggleDark: () => undefined,
    };
  }
  return ctx;
}
