import AsyncStorage from "@react-native-async-storage/async-storage";
import { getRevealRemoteConfig } from "./revealRemote";
import { canonicalizeRevealThemeId, type RevealThemeId } from "./revealTheme";
import { themeStorageKeys, weeklyDocTheme } from "./revealThemeRotation";

const THEME_LABELS: Record<string, { zh: string; en: string; vi: string }> = {
  neon: { zh: "赛博故障风", en: "Cyberpunk Glitch", vi: "Cyberpunk Glitch" },
  cute: { zh: "治愈系 ASMR", en: "Healing ASMR", vi: "ASMR chữa lành" },
  luxury: { zh: "派对狂欢", en: "Party Carnival", vi: "Tiệc carnival" },
  default: { zh: "经典特效", en: "Classic", vi: "Cổ điển" },
  classic: { zh: "经典特效", en: "Classic", vi: "Cổ điển" },
  cyberpunk: { zh: "赛博故障风", en: "Cyberpunk Glitch", vi: "Cyberpunk Glitch" },
  asmr: { zh: "治愈系 ASMR", en: "Healing ASMR", vi: "ASMR chữa lành" },
  party: { zh: "派对狂欢", en: "Party Carnival", vi: "Tiệc carnival" },
  adventure: { zh: "沉浸式叙事", en: "Adventure Narrative", vi: "Phiêu lưu tự sự" },
};

export function themeDisplayName(id: string, lang: "zh" | "en" | "vi" = "zh"): string {
  const key = id.toLowerCase();
  const row = THEME_LABELS[key] ?? THEME_LABELS[canonicalizeRevealThemeId(key)];
  if (!row) return id;
  return row[lang];
}

/** Returns a banner message when the weekly theme changed since last visit. */
export async function consumeWeeklyThemeBanner(lang: "zh" | "en" | "vi" = "zh"): Promise<string | null> {
  const cfg = getRevealRemoteConfig();
  const active: RevealThemeId = canonicalizeRevealThemeId(
    cfg.currentTheme ?? weeklyDocTheme(Date.now(), cfg.rotationCycle ?? 7),
  );
  const prev = await AsyncStorage.getItem(themeStorageKeys.lastSeen);
  await AsyncStorage.setItem(themeStorageKeys.lastSeen, active);
  if (prev && prev === active) return null;
  if (!prev) return null;
  const name = themeDisplayName(cfg.currentTheme ?? active, lang);
  if (lang === "vi") return `Hiệu ứng mở hộp tuần này đã đổi thành [${name}], thử ngay!`;
  if (lang === "en") return `This week's unbox effect is now [${name}]. Try it!`;
  return `本周开箱特效已更新为[${name}]，快去试试吧！`;
}
