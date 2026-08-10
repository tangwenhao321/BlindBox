import AsyncStorage from "@react-native-async-storage/async-storage";
import { revealStorageKey } from "../utils/revealStorageNamespace";

const KEY = "atmosphere_profile";

export type AtmosphereProfile = {
  boxStyle: string;
  lightStyle: string;
  particleStyle: string;
  borderStyle: string;
  soundPack: string;
  hapticRhythm: string;
};

const DEFAULT: AtmosphereProfile = {
  boxStyle: "default",
  lightStyle: "warm",
  particleStyle: "sparkle",
  borderStyle: "gold",
  soundPack: "standard",
  hapticRhythm: "balanced",
};

let cached: AtmosphereProfile | null = null;

export async function loadAtmosphereProfile(): Promise<AtmosphereProfile> {
  if (cached) return cached;
  try {
    const raw = await AsyncStorage.getItem(revealStorageKey(KEY));
    if (!raw) {
      cached = { ...DEFAULT };
      return cached;
    }
    cached = { ...DEFAULT, ...(JSON.parse(raw) as Partial<AtmosphereProfile>) };
    return cached;
  } catch {
    cached = { ...DEFAULT };
    return cached;
  }
}

export async function saveAtmosphereProfile(profile: Partial<AtmosphereProfile>): Promise<AtmosphereProfile> {
  const next = { ...(await loadAtmosphereProfile()), ...profile };
  cached = next;
  await AsyncStorage.setItem(revealStorageKey(KEY), JSON.stringify(next));
  return next;
}
