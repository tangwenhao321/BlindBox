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
  if (normalized === "EPIC") return "#B87333";
  if (normalized === "RARE") return "#5B8A7A";
  if (normalized === "ADVANCED") return "#3D6B5C";
  if (normalized === "HIDDEN") return "#C4A574";
  return "#8A8178";
}

export const qualityColors: Record<QualityTier, { bg: string; border: string; text: string }> = {
  LEGENDARY: { bg: "#fff3e8", border: "#ffd8a8", text: "#b45309" },
  LEGEND: { bg: "#fff3e8", border: "#ffd8a8", text: "#b45309" },
  EPIC: { bg: "#f7efe6", border: "#e0c4a8", text: "#8B5A2B" },
  RARE: { bg: "#eef6f3", border: "#c5ddd4", text: "#3D6B5C" },
  ADVANCED: { bg: "#e8f2ee", border: "#a8c9bb", text: "#2F5648" },
  GENERAL: { bg: "#f5f2ee", border: "#ddd5cb", text: "#5C564E" },
  HIDDEN: { bg: "#1a1814", border: "#C4A574", text: "#E8D5B0" },
};

export const qualityColorsDark: Record<QualityTier, { bg: string; border: string; text: string }> = {
  LEGENDARY: { bg: "#3D2A0A", border: "#92400E", text: "#FCD34D" },
  LEGEND: { bg: "#3D2A0A", border: "#92400E", text: "#FCD34D" },
  EPIC: { bg: "#2A1C12", border: "#8B5A2B", text: "#D4A574" },
  RARE: { bg: "#142420", border: "#3D6B5C", text: "#8FB9A8" },
  ADVANCED: { bg: "#0F1F1A", border: "#2F5648", text: "#6B9A88" },
  GENERAL: { bg: "#221F1A", border: "#4A453C", text: "#B8B0A4" },
  HIDDEN: { bg: "#0E0C0A", border: "#C4A574", text: "#E8D5B0" },
};

export function resolveQualityColors(tier: QualityTier, isDark: boolean) {
  return isDark ? qualityColorsDark[tier] : qualityColors[tier];
}
