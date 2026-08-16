import type { RevealThemeId } from "./revealTheme";

/** Doc2 cinematic packs. `classic` keeps the existing charge-ring pipeline. */
export type RevealStoryboardId = "adventure" | "cyberpunk" | "asmr" | "party" | "classic";

export function canonicalizeStoryboardId(raw?: string | null): RevealStoryboardId {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return "classic";
  if (s === "cyberpunk" || s === "neon" || s === "glitch") return "cyberpunk";
  if (s === "asmr" || s === "cute" || s === "healing") return "asmr";
  if (s === "party" || s === "carnival" || s === "luxury") return "party";
  if (s === "adventure" || s === "narrative") return "adventure";
  if (s === "classic" || s === "default") return "classic";
  return "classic";
}

export function storyboardFromThemeId(id: RevealThemeId): RevealStoryboardId {
  if (id === "neon") return "cyberpunk";
  if (id === "cute") return "asmr";
  if (id === "luxury") return "party";
  return "classic";
}

export function inferStoryboardFromText(text: string): RevealStoryboardId | null {
  const s = text.toLowerCase();
  if (/潮|数码|科技|电竞|赛博|故障|game|tech|cyber|neon|glitch|cyberpunk|labubu|skullpanda/.test(s)) {
    return "cyberpunk";
  }
  if (/萌|可爱|少女|毛绒|治愈|asmr|cute|kawaii|pink|healing|chữa lành|dịu dàng/.test(s)) {
    return "asmr";
  }
  if (/限定|珍藏|黄金|派对|狂欢|vip|luxury|premium|legend|party|carnival|tiệc/.test(s)) {
    return "party";
  }
  if (/寻宝|叙事|探险|adventure|narrative|treasure|phiêu lưu|bản đồ/.test(s)) {
    return "adventure";
  }
  return null;
}

export function shouldPlayStoryboard(opts: {
  storyboard: RevealStoryboardId;
  reduceMotion?: boolean;
  degradeLevel?: number;
  density?: "full" | "lite";
}): boolean {
  if (opts.storyboard === "classic") return false;
  if (opts.reduceMotion) return false;
  if ((opts.degradeLevel ?? 0) >= 2) return false;
  return true;
}

/** Full cinematic on single / first / finale; lite on long multi-draw middles. */
export function resolveStoryboardDensity(
  revealIndex: number,
  totalReveals: number,
  storyboard: RevealStoryboardId = "classic",
): "full" | "lite" {
  if (storyboard === "classic") return "lite";
  if (totalReveals <= 1) return "full";
  if (revealIndex <= 0 || revealIndex >= totalReveals - 1) return "full";
  if (revealIndex % 4 === 0) return "full";
  return "lite";
}

export function storyboardChargeMs(baseChargeMs: number, density: "full" | "lite"): number {
  if (density === "lite") return Math.min(Math.max(baseChargeMs, 0), 200);
  return Math.max(baseChargeMs, 0);
}

export function storyboardFromCatalogKey(key: string): RevealStoryboardId {
  return canonicalizeStoryboardId(key);
}

export function storyboardBackdrop(storyboard: RevealStoryboardId): [string, string, string] {
  if (storyboard === "adventure") return ["#1a1208f2", "#2a1c10f0", "#120c08f2"];
  if (storyboard === "cyberpunk") return ["#040612f5", "#061428f2", "#02040af5"];
  if (storyboard === "asmr") return ["#1c1810f0", "#2a2418ee", "#18140ef0"];
  if (storyboard === "party") return ["#1a0820f2", "#2a1030f0", "#120818f2"];
  return ["#07060ef2", "#12101cf0", "#07060ef2"];
}

