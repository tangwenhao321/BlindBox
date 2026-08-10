export type TabKey = "home" | "mall" | "warehouse" | "profile";

export type TabBadgeValue = {
  count: number;
  approximate?: boolean;
};

export type TabBadges = Partial<Record<TabKey, number | TabBadgeValue>>;

export function formatTabBadgeCount(count: number, approximate = false): string {
  if (count <= 0) return "";
  const capped = count > 99 ? "99+" : String(count);
  return approximate ? `~${capped}` : capped;
}

export function resolveBadge(value: number | TabBadgeValue | undefined): { count: number; approximate: boolean } {
  if (value == null) return { count: 0, approximate: false };
  if (typeof value === "number") return { count: value, approximate: false };
  return { count: value.count, approximate: value.approximate === true };
}
