import type { TFunction } from "i18next";
import i18n from "../i18n";

export type QualityTier = "LEGENDARY" | "LEGEND" | "EPIC" | "RARE" | "ADVANCED" | "GENERAL" | "HIDDEN";

const TIER_ALIASES: Record<string, QualityTier> = {
  LEGENDARY: "LEGENDARY",
  LEGEND: "LEGENDARY",
  EPIC: "EPIC",
  RARE: "RARE",
  ADVANCED: "ADVANCED",
  GENERAL: "GENERAL",
  HIDDEN: "HIDDEN",
};

function tierI18nKey(tier: QualityTier): QualityTier {
  return tier === "LEGEND" ? "LEGENDARY" : tier;
}

export function normalizeQualityTier(value?: string | null): QualityTier {
  const key = (value || "GENERAL").toUpperCase();
  return TIER_ALIASES[key] || "GENERAL";
}

export function qualityLabel(tier: QualityTier, t?: TFunction) {
  const key = `qualityTier.${tierI18nKey(tier)}`;
  if (t) return t(key);
  return i18n.exists(key) ? i18n.t(key) : tier;
}

export function qualityLabelFromRaw(value?: string | null, t?: TFunction) {
  return qualityLabel(normalizeQualityTier(value), t);
}

export function qualityAccentColor(tier: QualityTier | string | undefined) {
  const normalized = typeof tier === "string" ? normalizeQualityTier(tier) : tier;
  if (normalized === "LEGENDARY") return "#F59E0B";
  if (normalized === "HIDDEN") return "#8B5CF6";
  return "#94A3B8";
}

export const qualityColors: Record<QualityTier, { bg: string; border: string; text: string }> = {
  LEGENDARY: { bg: "#fff3e8", border: "#ffd8a8", text: "#b45309" },
  LEGEND: { bg: "#fff3e8", border: "#ffd8a8", text: "#b45309" },
  EPIC: { bg: "#f5f0ff", border: "#d9c2ff", text: "#6d28d9" },
  RARE: { bg: "#ecfeff", border: "#bae6fd", text: "#0369a1" },
  ADVANCED: { bg: "#ecfdf5", border: "#bbf7d0", text: "#047857" },
  GENERAL: { bg: "#f8fafc", border: "#dbe4ee", text: "#475569" },
  HIDDEN: { bg: "#1f2435", border: "#4b5563", text: "#f8fafc" },
};

export const qualityColorsDark: Record<QualityTier, { bg: string; border: string; text: string }> = {
  LEGENDARY: { bg: "#3D2A0A", border: "#92400E", text: "#FCD34D" },
  LEGEND: { bg: "#3D2A0A", border: "#92400E", text: "#FCD34D" },
  EPIC: { bg: "#2E1F4A", border: "#6D28D9", text: "#C4B5FD" },
  RARE: { bg: "#0C2D3A", border: "#0369A1", text: "#7DD3FC" },
  ADVANCED: { bg: "#0D2818", border: "#047857", text: "#6EE7B7" },
  GENERAL: { bg: "#252836", border: "#454B63", text: "#B8BDD0" },
  HIDDEN: { bg: "#1f2435", border: "#4b5563", text: "#f8fafc" },
};

export function resolveQualityColors(tier: QualityTier, isDark: boolean) {
  return isDark ? qualityColorsDark[tier] : qualityColors[tier];
}
