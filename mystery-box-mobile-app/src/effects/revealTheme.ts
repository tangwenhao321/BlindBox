import type { EffectProfile } from "./config";
import type { ParticleShape } from "./burstParticles";
import type { CeremonyTier } from "./ceremonyTier";
import { getLustrePalette, tintLustrePalette, type LustrePalette } from "./lustrePalette";
import { getRevealRemoteConfig, resolveLustrePaletteIdForBox } from "./revealRemote";
import { resolveTimeOfDayBucket, resolveTimeOfDayLustreSaturation } from "./revealTimeOfDay";
import { resolveMonthlyEffectPoolId, resolveMonthlyParticleVariant } from "./revealMonthlyEffectPool";
import { applyWeeklyParticleBias } from "./revealWeeklyContentPool";
import { resolveSolarTermId } from "./revealSolarTermPool";
import {
  canonicalizeStoryboardId,
  inferStoryboardFromText,
  type RevealStoryboardId,
} from "./revealStoryboard";

export type RevealThemeId = "default" | "neon" | "cute" | "luxury";

/** Doc2 aliases map onto the four runtime theme ids. */
export function canonicalizeRevealThemeId(raw?: string | null): RevealThemeId {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return "default";
  if (s === "cyberpunk" || s === "neon" || s === "glitch") return "neon";
  if (s === "asmr" || s === "cute" || s === "healing") return "cute";
  if (s === "party" || s === "carnival" || s === "luxury") return "luxury";
  if (s === "adventure" || s === "narrative" || s === "default") return "default";
  if (s === "neon" || s === "cute" || s === "luxury" || s === "default") return s;
  return "default";
}

export type RevealTheme = {
  id: RevealThemeId;
  /** Doc2 cinematic pack. Independent of `id` so adventure ≠ classic. */
  storyboard?: RevealStoryboardId;
  accent: string;
  sparkle: string;
  rim: string;
  confetti: string[];
  particleBias: ParticleShape | "mixed";
};

const THEMES: Record<RevealThemeId, RevealTheme> = {
  default: {
    id: "default",
    storyboard: "classic",
    accent: "#4091FF",
    sparkle: "rgba(180, 220, 255, 1)",
    rim: "rgba(120, 180, 255, 0.45)",
    confetti: ["#FFD54F", "#FF8A65", "#81D4FA", "#FFFFFF", "#CE93D8"],
    particleBias: "mixed",
  },
  neon: {
    id: "neon",
    storyboard: "cyberpunk",
    accent: "#00E5FF",
    sparkle: "rgba(120, 255, 240, 1)",
    rim: "rgba(0, 229, 255, 0.55)",
    confetti: ["#00E5FF", "#76FF03", "#EA80FC", "#FFFFFF", "#18FFFF"],
    particleBias: "shard",
  },
  cute: {
    id: "cute",
    storyboard: "asmr",
    accent: "#FF80AB",
    sparkle: "rgba(255, 200, 230, 1)",
    rim: "rgba(255, 128, 171, 0.5)",
    confetti: ["#FF80AB", "#FFD180", "#B388FF", "#FFFFFF", "#FFAB91"],
    particleBias: "star",
  },
  luxury: {
    id: "luxury",
    storyboard: "party",
    accent: "#FFD54F",
    sparkle: "rgba(255, 245, 200, 1)",
    rim: "rgba(255, 215, 120, 0.55)",
    confetti: ["#FFD54F", "#FFB74D", "#FFF8E1", "#FFFFFF", "#FFCC80"],
    particleBias: "dot",
  },
};

function inferThemeId(text: string): RevealThemeId | null {
  const s = text.toLowerCase();
  if (/潮|数码|科技|电竞|赛博|故障|game|tech|cyber|neon|glitch|cyberpunk|labubu|skullpanda/.test(s)) {
    return "neon";
  }
  if (/萌|可爱|少女|毛绒|治愈|asmr|cute|kawaii|pink|healing|chữa lành|dịu dàng/.test(s)) {
    return "cute";
  }
  if (/限定|珍藏|黄金|派对|狂欢|vip|luxury|premium|legend|party|carnival|tiệc|bảo底/.test(s)) {
    return "luxury";
  }
  if (/寻宝|叙事|探险|adventure|narrative|treasure|phiêu lưu|bản đồ/.test(s)) {
    return "default";
  }
  return null;
}

function withStoryboard(theme: RevealTheme, storyboard: RevealStoryboardId): RevealTheme {
  return { ...theme, storyboard };
}

export function resolveRevealTheme(opts?: {
  categoryName?: string;
  boxName?: string;
  remoteThemeId?: string;
  storyboardId?: RevealStoryboardId;
}): RevealTheme {
  const cfg = getRevealRemoteConfig();
  const forcedStoryboard = opts?.storyboardId;
  if ((cfg.limitedThemePriority ?? 0) > 0 && cfg.limitedThemeId) {
    return withStoryboard(
      THEMES[canonicalizeRevealThemeId(cfg.limitedThemeId)],
      forcedStoryboard ?? canonicalizeStoryboardId(cfg.limitedThemeId),
    );
  }
  if (opts?.remoteThemeId) {
    return withStoryboard(
      THEMES[canonicalizeRevealThemeId(opts.remoteThemeId)],
      forcedStoryboard ?? canonicalizeStoryboardId(opts.remoteThemeId),
    );
  }
  if (cfg.currentTheme) {
    return withStoryboard(
      THEMES[canonicalizeRevealThemeId(cfg.currentTheme)],
      forcedStoryboard ?? canonicalizeStoryboardId(cfg.currentTheme),
    );
  }
  const fromCategory = opts?.categoryName ? inferThemeId(opts.categoryName) : null;
  if (fromCategory) {
    const inferred = inferStoryboardFromText(opts?.categoryName ?? "") ?? (THEMES[fromCategory].storyboard ?? "classic");
    return withStoryboard(THEMES[fromCategory], forcedStoryboard ?? inferred);
  }
  const fromBox = opts?.boxName ? inferThemeId(opts.boxName) : null;
  if (fromBox) {
    const inferred = inferStoryboardFromText(opts?.boxName ?? "") ?? (THEMES[fromBox].storyboard ?? "classic");
    return withStoryboard(THEMES[fromBox], forcedStoryboard ?? inferred);
  }
  return withStoryboard(applyWeeklySolarTheme(THEMES.default), forcedStoryboard ?? "classic");
}

function applyWeeklySolarTheme(theme: RevealTheme): RevealTheme {
  const weekly = applyWeeklyParticleBias(1);
  const solarId = resolveSolarTermId();
  let next = applyMonthlyParticleBias(theme);
  if (weekly !== 1) {
    next = { ...next, particleBias: weekly > 1.05 ? "shard" : "dot" };
  }
  const spring = new Set(["lichun", "yushui", "jingzhe", "chunfen", "qingming", "guyu"]);
  const summer = new Set(["lixia", "xiaoman", "mangzhong", "xiazhi", "xiaoshu", "dashu"]);
  const autumn = new Set(["liqiu", "chushu", "bailu", "qiufen", "hanlu", "shuangjiang"]);
  if (spring.has(solarId)) {
    next = { ...next, accent: "#7EE081", confetti: ["#7EE081", "#FFD54F", "#FFFFFF", next.accent] };
  } else if (summer.has(solarId)) {
    next = { ...next, accent: "#FFB74D" };
  } else if (autumn.has(solarId)) {
    next = { ...next, accent: "#FF8A65" };
  } else {
    next = { ...next, accent: "#81D4FA" };
  }
  return next;
}

export function applyMonthlyParticleBias(theme: RevealTheme): RevealTheme {
  const variant = resolveMonthlyParticleVariant(resolveMonthlyEffectPoolId());
  if (variant === "ribbon") return { ...theme, particleBias: "shard" };
  if (variant === "dust") return { ...theme, particleBias: "dot" };
  return { ...theme, particleBias: "star" };
}

/** 将系列主题色叠加到特效 profile（不改变品质文案） */
export function applyRevealTheme(profile: EffectProfile, theme: RevealTheme): EffectProfile {
  const storyboard = theme.storyboard ?? "classic";
  if (theme.id === "default" && storyboard === "classic") return profile;
  const blend = profile.tier === "GENERAL";
  return {
    ...profile,
    glowColor: blend ? `${theme.accent}88` : profile.glowColor,
    sparkleColor: theme.sparkle,
    rimColor: theme.rim,
    centerGlow: blend ? `${theme.accent}55` : profile.centerGlow,
  };
}

export function themeConfettiColors(theme: RevealTheme, accentColor: string) {
  return [accentColor, ...theme.confetti.slice(1)];
}

const THEME_LUSTRE_STRENGTH: Record<RevealThemeId, number> = {
  default: 0,
  neon: 0.26,
  cute: 0.22,
  luxury: 0.28,
};

const REMOTE_LUSTRE_PALETTE: Record<string, { accent: string; strength: number }> = {
  neon: { accent: "#00E5FF", strength: 0.32 },
  cute: { accent: "#FF80AB", strength: 0.28 },
  luxury: { accent: "#FFD54F", strength: 0.3 },
  warm: { accent: "#FB923C", strength: 0.24 },
  cool: { accent: "#38BDF8", strength: 0.24 },
  vivid: { accent: "#E879F9", strength: 0.34 },
};

export function applyRemoteLustrePalette(palette: LustrePalette, boxId?: string): LustrePalette {
  const id = (resolveLustrePaletteIdForBox(boxId) ?? "").toLowerCase();
  if (!id || id === "default") return palette;
  const preset = REMOTE_LUSTRE_PALETTE[id];
  if (!preset) return palette;
  return tintLustrePalette(palette, preset.accent, preset.strength);
}

/** 系列主题 + 远程 / 盲盒 palette 叠加琉光色相 */
export function resolveThemedLustre(
  tier: CeremonyTier | string,
  theme?: RevealTheme,
  boxId?: string,
): LustrePalette {
  let palette = getLustrePalette(tier);
  if (theme && theme.id !== "default") {
    palette = tintLustrePalette(palette, theme.accent, THEME_LUSTRE_STRENGTH[theme.id]);
  }
  palette = applyRemoteLustrePalette(palette, boxId);
  const cfg = getRevealRemoteConfig();
  if (cfg.atmosphereBuffEnabled) {
    const sat = resolveTimeOfDayLustreSaturation(resolveTimeOfDayBucket());
    const tint = theme?.accent ?? palette.rim[0] ?? "#4091FF";
    palette = tintLustrePalette(palette, tint, Math.max(0, sat - 1));
  }
  return palette;
}
