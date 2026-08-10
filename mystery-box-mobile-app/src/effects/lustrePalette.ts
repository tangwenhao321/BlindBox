import type { ColorValue } from "react-native";
import type { CeremonyTier } from "./ceremonyTier";
import { normalizeCeremonyTier } from "./ceremonyTier";
import { normalizeQualityTier } from "../utils/quality";

export type LustrePalette = {
  vignette: readonly [string, string, string];
  aurora: readonly string[];
  auroraSecondary: readonly string[];
  sheen: readonly string[];
  halo: readonly string[];
  rim: readonly string[];
  rays: readonly string[];
  sparkles: readonly string[];
  hGlow: readonly string[];
  vGlow: readonly string[];
  flashTint: readonly string[];
};

const PALETTES: Record<CeremonyTier, LustrePalette> = {
  GENERAL: {
    vignette: ["#020617", "#0c1929", "#020617"],
    aurora: ["#1d4ed866", "#06b6d455", "#818cf866", "#22d3ee44"],
    auroraSecondary: ["#312e8144", "#0ea5e933", "#6366f144"],
    sheen: ["transparent", "#7dd3fc55", "#c4b5fd44", "#67e8f933", "transparent"],
    halo: ["#1e3a8a55", "#38bdf855", "#a78bfa44", "#0ea5e933"],
    rim: ["#60a5fa", "#a78bfa", "#22d3ee", "#bae6fd"],
    rays: ["#60a5fa", "#818cf8", "#22d3ee", "#93c5fd"],
    sparkles: ["#e0f2fe", "#c4b5fd", "#67e8f9", "#ffffff"],
    hGlow: ["transparent", "#3b82f666", "#06b6d444", "transparent"],
    vGlow: ["transparent", "#6366f155", "#0ea5e933", "transparent"],
    flashTint: ["#dbeafe", "#e0e7ff", "#ffffff"],
  },
  HIDDEN: {
    vignette: ["#0f0518", "#1a0a2e", "#0a0412"],
    aurora: ["#7c3aed77", "#c026d366", "#6366f155", "#a855f744"],
    auroraSecondary: ["#4c1d9544", "#db277755", "#6d28d933"],
    sheen: ["transparent", "#e879f966", "#a78bfa55", "#f0abfc44", "transparent"],
    halo: ["#6d28d966", "#a855f755", "#c084fc44", "#7c3aed33"],
    rim: ["#c084fc", "#e879f9", "#a78bfa", "#f0abfc"],
    rays: ["#a855f7", "#c026d3", "#818cf8", "#e879f9"],
    sparkles: ["#f5d0fe", "#ddd6fe", "#ffffff", "#e879f9"],
    hGlow: ["transparent", "#9333ea66", "#c026d344", "transparent"],
    vGlow: ["transparent", "#7c3aed55", "#db277733", "transparent"],
    flashTint: ["#f3e8ff", "#fce7f3", "#ffffff"],
  },
  TREASURE_LEGEND: {
    vignette: ["#120a02", "#1f1204", "#0a0600"],
    aurora: ["#fbbf2477", "#fcd34d66", "#fda4af55", "#67e8f944", "#fde68a77"],
    auroraSecondary: ["#f59e0b55", "#fb718544", "#5eead433", "#fef3c766"],
    sheen: ["transparent", "#fef08a88", "#fcd34d66", "#fda4af55", "#a5f3fc44", "transparent"],
    halo: ["#f59e0b66", "#fcd34d55", "#fda4af44", "#67e8f933"],
    rim: ["#fcd34d", "#fbbf24", "#fda4af", "#67e8f9", "#fef9c3"],
    rays: ["#fbbf24", "#fcd34d", "#fda4af", "#fde68a", "#5eead4"],
    sparkles: ["#fffbeb", "#fef08a", "#fda4af", "#ffffff", "#a5f3fc"],
    hGlow: ["transparent", "#fbbf2477", "#fda4af44", "#67e8f933", "transparent"],
    vGlow: ["transparent", "#f59e0b66", "#c026d333", "transparent"],
    flashTint: ["#fef9c3", "#fff7ed", "#ffffff"],
  },
  PEERLESS: {
    vignette: ["#180604", "#2a0a06", "#100302"],
    aurora: ["#fb923c77", "#fbbf2466", "#f8717155", "#fcd34d66", "#fef08a55"],
    auroraSecondary: ["#ea580c55", "#dc262644", "#fbbf2455", "#fb718544"],
    sheen: ["transparent", "#fed7aa88", "#fbbf2477", "#fecaca66", "#fef08a55", "transparent"],
    halo: ["#ea580c66", "#f9731655", "#fbbf2444", "#fecaca33"],
    rim: ["#fb923c", "#fbbf24", "#f87171", "#fcd34d", "#fff1f2"],
    rays: ["#fb923c", "#fbbf24", "#f87171", "#fde047", "#ffffff"],
    sparkles: ["#fff7ed", "#fed7aa", "#fecaca", "#fef08a", "#ffffff"],
    hGlow: ["transparent", "#f9731677", "#fbbf2455", "#fecaca44", "transparent"],
    vGlow: ["transparent", "#ea580c66", "#fbbf2433", "transparent"],
    flashTint: ["#ffedd5", "#fef3c7", "#ffffff"],
  },
  TREASURE_PEERLESS: {
    vignette: ["#120818", "#1a0a1e", "#08040c"],
    aurora: ["#fbbf2477", "#f0abfc66", "#67e8f955", "#fda4af55", "#fef08a66", "#c4b5fd55"],
    auroraSecondary: ["#eab30855", "#d946ef44", "#22d3ee55", "#fb718544"],
    sheen: ["transparent", "#fef08a99", "#f0abfc77", "#67e8f966", "#fda4af55", "#ffffff88", "transparent"],
    halo: ["#fbbf2466", "#e879f955", "#22d3ee44", "#fda4af33", "#ffffff22"],
    rim: ["#fcd34d", "#f0abfc", "#67e8f9", "#fda4af", "#ffffff"],
    rays: ["#fbbf24", "#e879f9", "#22d3ee", "#fda4af", "#fef08a", "#ffffff"],
    sparkles: ["#ffffff", "#fef08a", "#f0abfc", "#67e8f9", "#fda4af", "#fcd34d"],
    hGlow: ["transparent", "#fbbf2488", "#e879f966", "#67e8f955", "#fda4af44", "transparent"],
    vGlow: ["transparent", "#d946ef66", "#22d3ee44", "#fbbf2433", "transparent"],
    flashTint: ["#fef9c3", "#fae8ff", "#ecfeff", "#ffffff"],
  },
};

export function getLustrePalette(tier: CeremonyTier | string): LustrePalette {
  return PALETTES[normalizeCeremonyTier(tier)];
}

/** 用户可见品质 → 内部琉光档位（普通款无琉光描边） */
export function lustreTierFromQuality(qualityType?: string | null): CeremonyTier | null {
  const q = normalizeQualityTier(qualityType);
  if (q === "LEGENDARY") return "TREASURE_LEGEND";
  if (q === "HIDDEN") return "HIDDEN";
  return null;
}

export function pickLustreColor(palette: LustrePalette, key: keyof Pick<LustrePalette, "rays" | "sparkles" | "rim">, index: number) {
  const list = palette[key];
  return list[index % list.length];
}

type Rgba = { r: number; g: number; b: number; a: number };

function parseHexColor(input: string): Rgba | null {
  const raw = input.trim();
  if (raw === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  const hex = raw.startsWith("#") ? raw.slice(1) : raw;
  if (hex.length === 3) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
      a: 1,
    };
  }
  if (hex.length === 6) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }
  if (hex.length === 8) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: parseInt(hex.slice(6, 8), 16) / 255,
    };
  }
  return null;
}

function formatHexColor({ r, g, b, a }: Rgba): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const rr = clamp(r).toString(16).padStart(2, "0");
  const gg = clamp(g).toString(16).padStart(2, "0");
  const bb = clamp(b).toString(16).padStart(2, "0");
  if (a >= 0.999) return `#${rr}${gg}${bb}`;
  const aa = clamp(a * 255).toString(16).padStart(2, "0");
  return `#${rr}${gg}${bb}${aa}`;
}

/** 将 accent 色相叠入琉光色（保留原 alpha） */
export function blendLustreColor(base: string, accent: string, amount: number): string {
  if (base === "transparent" || amount <= 0) return base;
  const a = parseHexColor(base);
  const b = parseHexColor(accent);
  if (!a || !b) return base;
  const t = Math.max(0, Math.min(1, amount));
  return formatHexColor({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
    a: a.a,
  });
}

function tintStops(stops: readonly string[], accent: string, amount: number): readonly string[] {
  return stops.map((c) => blendLustreColor(c, accent, amount));
}

/** 按系列主题 accent 微调 palette（vignette 保持暗角） */
export function tintLustrePalette(palette: LustrePalette, accent: string, strength = 0.24): LustrePalette {
  if (!accent || strength <= 0) return palette;
  return {
    vignette: palette.vignette,
    aurora: tintStops(palette.aurora, accent, strength),
    auroraSecondary: tintStops(palette.auroraSecondary, accent, strength * 0.85),
    sheen: tintStops(palette.sheen, accent, strength * 1.1),
    halo: tintStops(palette.halo, accent, strength),
    rim: tintStops(palette.rim, accent, strength * 0.9),
    rays: tintStops(palette.rays, accent, strength),
    sparkles: tintStops(palette.sparkles, accent, strength * 0.65),
    hGlow: tintStops(palette.hGlow, accent, strength * 0.75),
    vGlow: tintStops(palette.vGlow, accent, strength * 0.75),
    flashTint: tintStops(palette.flashTint, accent, strength * 0.45),
  };
}

/** expo-linear-gradient 至少需要 2 个色标 */
export function lustreGradientStops(colors: readonly string[]): [ColorValue, ColorValue, ...ColorValue[]] {
  const a = colors[0] ?? "#000000";
  const b = colors[1] ?? a;
  if (colors.length <= 2) return [a, b];
  return [a, b, ...colors.slice(2)] as [ColorValue, ColorValue, ...ColorValue[]];
}
