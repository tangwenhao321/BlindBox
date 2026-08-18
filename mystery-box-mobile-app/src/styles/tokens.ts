/** 盲盒 App 统一设计令牌 — 日间柜 / 夜市珍宝柜 */

import { StyleSheet } from "react-native";

/**
 * Night-market treasure cabinet (ink + brass).
 * Brand-default dark palette; used as ThemeMode "dark".
 */
export const nightColors = {
  bgPage: "#14110F",
  bgCard: "#221E1B",
  bgSoft: "#1A1614",
  bgBrandSoft: "#2A2420",
  bgMuted: "#2E2824",
  border: "#3A342E",
  borderSoft: "#4A423A",
  brand: "#C4A574",
  brandDark: "#A68B5B",
  brandText: "#E0C48A",
  brandGradientEnd: "#E0C48A",
  accent: "#D4A574",
  accentSoft: "#2A2218",
  link: "#C4A574",
  textPrimary: "#F5F0E8",
  textSecondary: "#B8A99A",
  textMuted: "#8A7E72",
  textLoading: "#9A8E82",
  textOnBrand: "#14110F",
  success: "#3D9B6E",
  successSoft: "#14241C",
  successSoftBorder: "#1F4A34",
  warning: "#E0A84A",
  warningSoft: "#2A2210",
  infoSoft: "#1E1C18",
  infoSoftBorder: "#4A423A",
  /** Mapped from violet → muted brass/ink (legacy key names preserved) */
  violetSoft: "#2A2420",
  violetPanel: "#221E1B",
  violetPanelBorder: "#5A4E3E",
  violetTextStrong: "#C4A574",
  /** Optional aliases for legacy violet* panel keys */
  brassPanel: "#221E1B",
  brassPanelBorder: "#5A4E3E",
  brassTextStrong: "#C4A574",
  textTitleSoft: "#E8DFD4",
  textSubtitleSoft: "#B8A99A",
  textPanelSubtle: "#A89888",
  textSummary: "#9A8E82",
  textDark: "#F5F0E8",
  textPlaceholder: "#6E645A",
  chipBorder: "#A68B5B",
  chipSuccessBorder: "#3D9B6E",
  successStrong: "#2E7A56",
  successText: "#4AB87E",
  iconMuted: "#7A7066",
  overlay: "rgba(20, 17, 15, 0.72)",
  tabBarBg: "#1A1614",
  heroOverlay: "rgba(20, 17, 15, 0.55)",
  danger: "#C45A5A",
  dangerSoft: "#2A1616",
  dangerBorder: "#6B3030",
  mockWechatGreen: "#07C160",
  warningSoftBorder: "#6B5020",
  profileHeroGlass: "rgba(245, 240, 232, 0.08)",
  profileHeroGlassBorder: "rgba(196, 165, 116, 0.35)",
  profileHeroSubtext: "rgba(245, 240, 232, 0.8)",
  profileHeroBtnBg: "rgba(196, 165, 116, 0.15)",
  profileHeroBtnBorder: "rgba(196, 165, 116, 0.45)",
  shadowInk: "#0A0807",
  shadowBrand: "#1A1410",
  shadowViolet: "#14110F",
  tierTrack: "#3A342E",
  profileHeaderBg: "#221E1B",
  profileHeaderDeep: "#2A2420",
  profilePink: "#C4A574",
  profilePinkSoft: "#1A1614",
  accentOrange: "#D4A060",
  accentOrangeEnd: "#E0C48A",
  tabActiveCircle: "#C4A574",
  pageBg: "#14110F",
  teal: "#5A9E8E",
  tealDark: "#3D7A6C",
  tealSoft: "#1A2824",
  orderUnpaidBg: "#2A2210",
  orderUnpaidText: "#E0A84A",
  orderUnpaidBorder: "#6B5020",
  orderDeliverBg: "#1E1C18",
  orderDeliverText: "#C4A574",
  orderDeliverBorder: "#5A4E3E",
  orderReceiveBg: "#1A2428",
  orderReceiveText: "#6BA8B8",
  orderReceiveBorder: "#2A4450",
  orderFinishedBg: "#14241C",
  orderFinishedText: "#4AB87E",
  orderFinishedBorder: "#1F4A34",
  orderDefaultBg: "#1A1614",
  orderDefaultText: "#B8A99A",
  orderDefaultBorder: "#3A342E",
  queueReadyBg: "#14241C",
  queueReadyText: "#4AB87E",
  newcomerBarGradientEnd: "#A68B5B",
  newcomerBarCtaBg: "#E0C48A",
  newcomerBarCtaText: "#14110F",
  /** Soft ink lip under box cover imagery */
  shelfLip: "rgba(20, 17, 15, 0.45)",
};

/**
 * Day cabinet — bright stall wood + paper tags + ink text + brass CTA.
 * ThemeMode "light". Cooler paper page (not heavy beige parchment); planed wood cards.
 */
export const lightColors = {
  bgPage: "#F3F1EC",
  bgCard: "#EBE6DC",
  bgSoft: "#E4DFD6",
  bgBrandSoft: "#E8E2D4",
  bgMuted: "#DAD4CA",
  border: "#CCC5B8",
  borderSoft: "#C0B8AA",
  brand: "#A68B5B",
  brandDark: "#8B7349",
  brandText: "#7A6640",
  brandGradientEnd: "#C4A574",
  accent: "#A68B5B",
  accentSoft: "#EDE4D4",
  link: "#8B7349",
  textPrimary: "#1C1917",
  textSecondary: "#57534E",
  textMuted: "#78716C",
  textLoading: "#8A847C",
  textOnBrand: "#FFFBF5",
  success: "#2E7A56",
  successSoft: "#E4F0E8",
  successSoftBorder: "#A8C9B4",
  warning: "#C4862A",
  warningSoft: "#F5ECD8",
  infoSoft: "#E8E3DB",
  infoSoftBorder: "#CCC5B8",
  /** Legacy violet* keys → stall wood/brass on day surfaces (prefer border / brandDark in new code) */
  violetSoft: "#E8E2D4",
  violetPanel: "#EBE6DC",
  violetPanelBorder: "#C0B8AA",
  violetTextStrong: "#7A6640",
  /** Optional aliases for legacy violet* panel keys */
  brassPanel: "#EBE6DC",
  brassPanelBorder: "#C0B8AA",
  brassTextStrong: "#7A6640",
  textTitleSoft: "#292524",
  textSubtitleSoft: "#57534E",
  textPanelSubtle: "#78716C",
  textSummary: "#78716C",
  textDark: "#1C1917",
  textPlaceholder: "#A8A29E",
  chipBorder: "#A68B5B",
  chipSuccessBorder: "#2E7A56",
  successStrong: "#246B4A",
  successText: "#2E7A56",
  iconMuted: "#A8A29E",
  overlay: "rgba(28, 25, 23, 0.45)",
  tabBarBg: "#EBE6DC",
  heroOverlay: "rgba(243, 241, 236, 0.55)",
  danger: "#B43A3A",
  dangerSoft: "#F5E4E4",
  dangerBorder: "#E0B0B0",
  mockWechatGreen: "#07C160",
  warningSoftBorder: "#D4B878",
  profileHeroGlass: "rgba(28, 25, 23, 0.06)",
  profileHeroGlassBorder: "rgba(166, 139, 91, 0.35)",
  profileHeroSubtext: "rgba(28, 25, 23, 0.72)",
  profileHeroBtnBg: "rgba(166, 139, 91, 0.12)",
  profileHeroBtnBorder: "rgba(166, 139, 91, 0.4)",
  shadowInk: "#1C1917",
  shadowBrand: "#A68B5B",
  shadowViolet: "#8B7349",
  tierTrack: "#CCC5B8",
  profileHeaderBg: "#E4DFD6",
  profileHeaderDeep: "#DAD4CA",
  profilePink: "#A68B5B",
  profilePinkSoft: "#F3F1EC",
  accentOrange: "#C4862A",
  accentOrangeEnd: "#A68B5B",
  tabActiveCircle: "#A68B5B",
  pageBg: "#F3F1EC",
  teal: "#3D7A6C",
  tealDark: "#2F5F54",
  tealSoft: "#E0EBE8",
  orderUnpaidBg: "#F5ECD8",
  orderUnpaidText: "#C4862A",
  orderUnpaidBorder: "#D4B878",
  orderDeliverBg: "#F3F1EC",
  orderDeliverText: "#8B7349",
  orderDeliverBorder: "#C0B8AA",
  orderReceiveBg: "#E4EEF0",
  orderReceiveText: "#3D6A78",
  orderReceiveBorder: "#A8C4CC",
  orderFinishedBg: "#E4F0E8",
  orderFinishedText: "#2E7A56",
  orderFinishedBorder: "#A8C9B4",
  orderDefaultBg: "#E4DFD6",
  orderDefaultText: "#57534E",
  orderDefaultBorder: "#CCC5B8",
  queueReadyBg: "#E4F0E8",
  queueReadyText: "#2E7A56",
  newcomerBarGradientEnd: "#8B7349",
  newcomerBarCtaBg: "#A68B5B",
  newcomerBarCtaText: "#FFFBF5",
  /** Planed-wood shelf lip under box cover imagery (day stall — stronger than parchment) */
  shelfLip: "rgba(28, 25, 23, 0.36)",
};

/** Brand/splash alias — night cabinet (prefer ThemeContext colors at runtime). */
export const colors = nightColors;

export const shadows = {
  card: {
    shadowColor: "#0A0807",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  cardSm: {
    shadowColor: "#0A0807",
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  float: {
    shadowColor: "#0A0807",
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  tabBar: {
    shadowColor: "#0A0807",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
  },
};

/** Shared shelf lip under cover imagery (Home + Mall cards). */
export const shelfLipMetrics = {
  height: 12,
  borderTopWidth: StyleSheet.hairlineWidth,
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const typography = {
  display: 32,
  h1: 28,
  h2: 24,
  h3: 20,
  h4: 17,
  bodyLg: 16,
  body: 15,
  caption: 13,
  micro: 11,
};

/** Loaded via @expo-google-fonts in app/_layout.tsx (Be Vietnam Pro only). */
export const fontFamily = {
  display: "BeVietnamPro_600SemiBold",
  displayBold: "BeVietnamPro_600SemiBold",
  body: "BeVietnamPro_400Regular",
  bodyMedium: "BeVietnamPro_500Medium",
  bodySemiBold: "BeVietnamPro_600SemiBold",
  numeral: "BeVietnamPro_600SemiBold",
} as const;

export type AppFontStyle = keyof typeof fontFamily;

/** Helper for StyleSheet: `font('display')` → `{ fontFamily: 'BeVietnamPro_600SemiBold' }` */
export function font(style: AppFontStyle): { fontFamily: string } {
  return { fontFamily: fontFamily[style] };
}

/** Convert `#RRGGBB` to `rgba(r,g,b,a)` for theme washes / fades. */
export function withAlpha(hex: string, alpha: number): string {
  const raw = hex.replace("#", "").trim();
  if (raw.length < 6) return hex;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const layout = {
  screenPaddingX: spacing.lg,
  /** Clears BottomTabBar (icon row + home-indicator padding). */
  screenPaddingBottom: 108,
  /**
   * Tab bar content height (icon row + label), excluding safe-area inset.
   * Keep in sync with BottomTabBar / HomeNewcomerBar / WarehouseView ship-bar clearance.
   */
  tabBarClearance: 72,
  inputMinHeight: 48,
  buttonMinHeight: 48,
};
