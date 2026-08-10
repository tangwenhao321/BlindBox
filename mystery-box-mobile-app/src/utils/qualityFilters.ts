import { normalizeQualityTier } from "./quality";

export type PrizeQualityFilter = "ALL" | "GENERAL" | "HIDDEN" | "ADVANCED" | "LEGENDARY";

export const PRIZE_QUALITY_FILTER_TABS: { id: PrizeQualityFilter; labelKey: string }[] = [
  { id: "ALL", labelKey: "qualityFilter.all" },
  { id: "GENERAL", labelKey: "qualityFilter.general" },
  { id: "HIDDEN", labelKey: "qualityFilter.hidden" },
  { id: "ADVANCED", labelKey: "qualityFilter.advanced" },
  { id: "LEGENDARY", labelKey: "qualityFilter.legendary" },
];

export function filterItemsByQuality<T extends { qualityType?: string | null }>(
  items: T[],
  filter: PrizeQualityFilter,
): T[] {
  if (filter === "ALL") return items;
  return items.filter((item) => normalizeQualityTier(item.qualityType) === filter);
}
