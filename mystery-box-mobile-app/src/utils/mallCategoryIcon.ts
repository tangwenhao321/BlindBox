/** Locale-neutral category name → emoji (ASCII keywords + common CJK terms). */
const CATEGORY_ICON_RULES: ReadonlyArray<{ pattern: RegExp; icon: string }> = [
  { pattern: /apple|iphone|ipad|mac/i, icon: "📱" },
  { pattern: /xiaomi|redmi|mi\b/i, icon: "📲" },
  { pattern: /digital|3c|computer|laptop|pc\b/i, icon: "💻" },
  { pattern: /life|home|living|house/i, icon: "🏠" },
  { pattern: /new|arrival|fresh|monthly/i, icon: "📅" },
  { pattern: /hot|best|top|sale/i, icon: "🔥" },
  { pattern: /苹果|iPhone|Apple/i, icon: "📱" },
  { pattern: /小米|Xiaomi/i, icon: "📲" },
  { pattern: /数码|3C|电脑/i, icon: "💻" },
  { pattern: /生活|家居/i, icon: "🏠" },
  { pattern: /新|上/i, icon: "📅" },
  { pattern: /热|爆/i, icon: "🔥" },
];

export function pickMallCategoryIcon(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "🎁";
  for (const rule of CATEGORY_ICON_RULES) {
    if (rule.pattern.test(trimmed)) return rule.icon;
  }
  return "🎁";
}
