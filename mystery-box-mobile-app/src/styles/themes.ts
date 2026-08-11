import {
  font,
  fontFamily,
  layout,
  lightColors,
  nightColors,
  radius,
  shadows,
  spacing,
  typography,
} from "./tokens";

import type { ColorSchemeName } from "react-native";

export type ThemeColors = typeof lightColors;
export type ThemeMode = "light" | "dark" | "system";

export function resolveThemeMode(mode: ThemeMode, systemScheme: ColorSchemeName | null | undefined): "light" | "dark" {
  if (mode === "system") return systemScheme === "dark" ? "dark" : "light";
  return mode;
}

/** Day cabinet — bright stall wood + paper tags (ThemeMode "light") */
export { lightColors };

/** Night cabinet — ink/brass lacquer (ThemeMode "dark") */
export const darkColors: ThemeColors = nightColors;

export function getThemeColors(mode: "light" | "dark"): ThemeColors {
  return mode === "dark" ? darkColors : lightColors;
}

export { font, fontFamily, layout, nightColors, radius, shadows, spacing, typography };
