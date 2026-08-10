import { colors as lightColors, layout, radius, shadows, spacing, typography } from "./tokens";

import type { ColorSchemeName } from "react-native";

export type ThemeColors = typeof lightColors;
export type ThemeMode = "light" | "dark" | "system";

export function resolveThemeMode(mode: ThemeMode, systemScheme: ColorSchemeName | null | undefined): "light" | "dark" {
  if (mode === "system") return systemScheme === "dark" ? "dark" : "light";
  return mode;
}

export const darkColors: ThemeColors = {
  ...lightColors,
  bgPage: "#0F1117",
  bgCard: "#1A1D2E",
  bgSoft: "#252836",
  bgBrandSoft: "#2A2650",
  bgMuted: "#2D3148",
  border: "#3A3F55",
  borderSoft: "#454B63",
  brand: "#7C6FFF",
  brandDark: "#9B8CFF",
  brandText: "#B4ABFF",
  textPrimary: "#F3F2FF",
  textSecondary: "#B8BDD0",
  textMuted: "#8B90A5",
  textLoading: "#9CA3B8",
  textOnBrand: "#FFFFFF",
  successSoft: "#0D2818",
  successSoftBorder: "#065F46",
  warningSoft: "#2A2208",
  infoSoft: "#1E2240",
  infoSoftBorder: "#3730A3",
  violetSoft: "#2A2650",
  violetPanel: "#252040",
  violetPanelBorder: "#4338CA",
  textTitleSoft: "#E5E7EB",
  textSubtitleSoft: "#B8BDD0",
  textPanelSubtle: "#9CA3AF",
  textSummary: "#9CA3AF",
  textDark: "#F9FAFB",
  textPlaceholder: "#6B7280",
  chipBorder: "#5B4DFF",
  overlay: "rgba(0, 0, 0, 0.65)",
  tabBarBg: "#1A1D2E",
  heroOverlay: "rgba(67, 56, 202, 0.7)",
  dangerSoft: "#3F1218",
  dangerBorder: "#9F1239",
  warningSoftBorder: "#78350F",
  profileHeroGlass: "rgba(255,255,255,0.12)",
  profileHeroGlassBorder: "rgba(255,255,255,0.25)",
  profileHeroSubtext: "rgba(255,255,255,0.75)",
  profileHeroBtnBg: "rgba(255,255,255,0.1)",
  profileHeroBtnBorder: "rgba(255,255,255,0.35)",
  profileHeaderBg: "#2A1A22",
  profileHeaderDeep: "#3D2230",
  profilePinkSoft: "#2A1A22",
  pageBg: "#12141C",
  tealSoft: "#0D2A26",
  orderUnpaidBg: "#2A2208",
  orderUnpaidText: "#FBBF24",
  orderUnpaidBorder: "#78350F",
  orderDeliverBg: "#1E2240",
  orderDeliverText: "#93C5FD",
  orderDeliverBorder: "#3730A3",
  orderReceiveBg: "#0C2D3A",
  orderReceiveText: "#67E8F9",
  orderReceiveBorder: "#155E75",
  orderFinishedBg: "#0D2818",
  orderFinishedText: "#6EE7B7",
  orderFinishedBorder: "#065F46",
  orderDefaultBg: "#252836",
  orderDefaultText: "#9CA3AF",
  orderDefaultBorder: "#3A3F55",
  queueReadyBg: "#0D2818",
  queueReadyText: "#6EE7B7",
  shadowInk: "#000000",
};

export function getThemeColors(mode: "light" | "dark"): ThemeColors {
  return mode === "dark" ? darkColors : lightColors;
}

export { lightColors, layout, radius, shadows, spacing, typography };
