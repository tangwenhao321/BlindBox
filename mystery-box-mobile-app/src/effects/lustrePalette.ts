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

/** Night-market lamp / ink vignette / brass sparks / jade accents — no violet/magenta/cyan neon */
const PALETTES: Record<CeremonyTier, LustrePalette> = {
  GENERAL: {
    vignette: ["#0c0a08", "#1a1612", "#0a0806"],
    aurora: ["#c4a57455", "#e0c48a44", "#8a817833", "#5b8a7a33"],
    auroraSecondary: ["#a68b5b44", "#d4a06033", "#3d6b5c33"],
    sheen: ["transparent", "#e8d5b055", "#c4a57444", "#8fb9a833", "transparent"],
    halo: ["#c4a57455", "#e0c48a44", "#8a817833", "#5b8a7a33"],
    rim: ["#c4a574", "#e0c48a", "#a68b5b", "#d4c4a8"],
    rays: ["#c4a574", "#e0c48a", "#a68b5b", "#d4a060"],
    sparkles: ["#f5edd8", "#e0c48a", "#c4a574", "#ffffff"],
    hGlow: ["transparent", "#c4a57466", "#e0c48a44", "transparent"],
    vGlow: ["transparent", "#a68b5b55", "#5b8a7a33", "transparent"],
    flashTint: ["#f5edd8", "#ede4d4", "#ffffff"],
  },
  HIDDEN: {
    vignette: ["#050403", "#0e0c0a", "#030201"],
    aurora: ["#c4a57466", "#8b734955", "#1a181444", "#e8d5b033"],
    auroraSecondary: ["#a68b5b44", "#5c564e33", "#c4a57433"],
    sheen: ["transparent", "#e8d5b066", "#c4a57455", "#a68b5b44", "transparent"],
    halo: ["#c4a57466", "#a68b5b55", "#e8d5b044", "#8b734933"],
    rim: ["#c4a574", "#e8d5b0", "#a68b5b", "#d4c4a8"],
    rays: ["#c4a574", "#e0c48a", "#8b7349", "#e8d5b0"],
    sparkles: ["#e8d5b0", "#c4a574", "#ffffff", "#d4c4a8"],
    hGlow: ["transparent", "#c4a57466", "#a68b5b44", "transparent"],
    vGlow: ["transparent", "#8b734955", "#c4a57433", "transparent"],
    flashTint: ["#e8d5b0", "#d4c4a8", "#ffffff"],
  },
  TREASURE_LEGEND: {
    vignette: ["#120a02", "#1f1204", "#0a0600"],
    aurora: ["#fbbf2477", "#fcd34d66", "#e0c48a55", "#c4a57444", "#fde68a77"],
    auroraSecondary: ["#f59e0b55", "#d4a06044", "#a68b5b33", "#fef3c766"],
    sheen: ["transparent", "#fef08a88", "#fcd34d66", "#e0c48a55", "#c4a57444", "transparent"],
    halo: ["#f59e0b66", "#fcd34d55", "#e0c48a44", "#c4a57433"],
    rim: ["#fcd34d", "#fbbf24", "#e0c48a", "#c4a574", "#fef9c3"],
    rays: ["#fbbf24", "#fcd34d", "#e0c48a", "#fde68a", "#c4a574"],
    sparkles: ["#fffbeb", "#fef08a", "#e0c48a", "#ffffff", "#fcd34d"],
    hGlow: ["transparent", "#fbbf2477", "#e0c48a44", "#c4a57433", "transparent"],
    vGlow: ["transparent", "#f59e0b66", "#a68b5b33", "transparent"],
    flashTint: ["#fef9c3", "#fff7ed", "#ffffff"],
  },
  PEERLESS: {
    vignette: ["#180604", "#2a0a06", "#100302"],
    aurora: ["#fb923c77", "#fbbf2466", "#c4a57455", "#fcd34d66", "#d4a06055"],
    auroraSecondary: ["#ea580c55", "#b4530944", "#fbbf2455", "#8b5a2b44"],
    sheen: ["transparent", "#fed7aa88", "#fbbf2477", "#e0c48a66", "#fef08a55", "transparent"],
    halo: ["#ea580c66", "#f9731655", "#fbbf2444", "#c4a57433"],
    rim: ["#fb923c", "#fbbf24", "#c4a574", "#fcd34d", "#fff1e8"],
    rays: ["#fb923c", "#fbbf24", "#d4a060", "#fde047", "#e0c48a"],
    sparkles: ["#fff7ed", "#fed7aa", "#e0c48a", "#fef08a", "#ffffff"],
    hGlow: ["transparent", "#f9731677", "#fbbf2455", "#c4a57444", "transparent"],
    vGlow: ["transparent", "#ea580c66", "#fbbf2433", "transparent"],
    flashTint: ["#ffedd5", "#fef3c7", "#ffffff"],
  },
  TREASURE_PEERLESS: {
    vignette: ["#100806", "#1a1008", "#080402"],
    aurora: ["#fbbf2477", "#c4a57466", "#5b8a7a55", "#fb923c55", "#fef08a66", "#e0c48a55"],
    auroraSecondary: ["#eab30855", "#a68b5b44", "#3d6b5c55", "#d4a06044"],
    sheen: ["transparent", "#fef08a99", "#c4a57477", "#8fb9a866", "#e0c48a55", "#ffffff88", "transparent"],
    halo: ["#fbbf2466", "#c4a57455", "#5b8a7a44", "#d4a06033", "#ffffff22"],
    rim: ["#fcd34d", "#c4a574", "#8fb9a8", "#e0c48a", "#ffffff"],
    rays: ["#fbbf24", "#c4a574", "#5b8a7a", "#d4a060", "#fef08a", "#ffffff"],
    sparkles: ["#ffffff", "#fef08a", "#c4a574", "#8fb9a8", "#e0c48a", "#fcd34d"],
    hGlow: ["transparent", "#fbbf2488", "#c4a57466", "#5b8a7a55", "#d4a06044", "transparent"],
    vGlow: ["transparent", "#a68b5b66", "#3d6b5c44", "#fbbf2433", "transparent"],
    flashTint: ["#fef9c3", "#ede4d4", "#eef6f3", "#ffffff"],
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
