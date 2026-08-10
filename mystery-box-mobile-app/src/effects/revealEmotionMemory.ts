import AsyncStorage from "@react-native-async-storage/async-storage";
import { revealStorageKey } from "../utils/revealStorageNamespace";
import type { RevealEffectPresetId } from "../utils/revealSettings";

const KEY = "emotion_memory";

type TierCounts = Record<string, number>;

type EmotionMemory = {
  tiers: TierCounts;
  updatedAt: number;
};

const EMPTY: EmotionMemory = { tiers: {}, updatedAt: 0 };

let cached: EmotionMemory | null = null;

async function loadMemory(): Promise<EmotionMemory> {
  if (cached) return cached;
  try {
    const raw = await AsyncStorage.getItem(revealStorageKey(KEY));
    if (!raw) {
      cached = { ...EMPTY };
      return cached;
    }
    cached = { ...EMPTY, ...(JSON.parse(raw) as Partial<EmotionMemory>) };
    return cached;
  } catch {
    cached = { ...EMPTY };
    return cached;
  }
}

async function persist(memory: EmotionMemory): Promise<void> {
  cached = memory;
  await AsyncStorage.setItem(revealStorageKey(KEY), JSON.stringify(memory));
}

export async function recordTierPreference(tier: string): Promise<void> {
  const memory = await loadMemory();
  const key = tier.trim().toUpperCase() || "GENERAL";
  const next: EmotionMemory = {
    tiers: { ...memory.tiers, [key]: (memory.tiers[key] ?? 0) + 1 },
    updatedAt: Date.now(),
  };
  await persist(next);
}

export async function resolvePreferredEffectStyle(): Promise<RevealEffectPresetId> {
  const memory = await loadMemory();
  const entries = Object.entries(memory.tiers);
  if (!entries.length) return "default";
  entries.sort((a, b) => b[1] - a[1]);
  const top = entries[0][0];
  if (top === "HIDDEN" || top === "LEGENDARY" || top === "TREASURE_LEGEND") return "neon";
  if (top === "LIMITED" || top === "EVENT_LIMITED") return "warm";
  return "default";
}
