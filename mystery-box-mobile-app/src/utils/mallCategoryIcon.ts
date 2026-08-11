/** Locale-neutral category name → MaterialCommunityIcons glyph name. */
export type MallCategoryIconName =
  | "tag-outline"
  | "calendar-month-outline"
  | "laptop"
  | "cellphone"
  | "home-outline"
  | "fire"
  | "gift-outline"
  | "cellphone-wireless";

const CATEGORY_ICON_RULES: ReadonlyArray<{ pattern: RegExp; icon: MallCategoryIconName }> = [
  { pattern: /apple|iphone|ipad|mac/i, icon: "cellphone" },
  { pattern: /xiaomi|redmi|mi\b/i, icon: "cellphone-wireless" },
  { pattern: /digital|3c|computer|laptop|pc\b/i, icon: "laptop" },
  { pattern: /life|home|living|house/i, icon: "home-outline" },
  { pattern: /new|arrival|fresh|monthly/i, icon: "calendar-month-outline" },
  { pattern: /hot|best|top|sale/i, icon: "fire" },
  { pattern: /苹果|iPhone|Apple/i, icon: "cellphone" },
  { pattern: /小米|Xiaomi/i, icon: "cellphone-wireless" },
  { pattern: /数码|3C|电脑/i, icon: "laptop" },
  { pattern: /生活|家居/i, icon: "home-outline" },
  { pattern: /新|上/i, icon: "calendar-month-outline" },
  { pattern: /热|爆/i, icon: "fire" },
];

export function pickMallCategoryIcon(name: string): MallCategoryIconName {
  const trimmed = name.trim();
  if (!trimmed) return "gift-outline";
  for (const rule of CATEGORY_ICON_RULES) {
    if (rule.pattern.test(trimmed)) return rule.icon;
  }
  return "gift-outline";
}
