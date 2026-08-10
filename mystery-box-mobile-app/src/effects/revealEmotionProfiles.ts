import AsyncStorage from "@react-native-async-storage/async-storage";
import { revealStorageKey } from "../utils/revealStorageNamespace";

export type EmotionProfile = {
  id: string;
  name: string;
  chargeScale: number;
  gapScale: number;
  hapticScale: number;
  volumeScale: number;
  particleScale: number;
};

const KEY = revealStorageKey("reveal_emotion_profiles_v1");
const DEFAULTS: EmotionProfile[] = [
  { id: "stim", name: "Max thrill", chargeScale: 1.15, gapScale: 0.9, hapticScale: 1.2, volumeScale: 1.1, particleScale: 1.2 },
  { id: "chill", name: "Chill", chargeScale: 0.9, gapScale: 1.15, hapticScale: 0.5, volumeScale: 0.75, particleScale: 0.7 },
  { id: "quiet", name: "Quiet binge", chargeScale: 1, gapScale: 1, hapticScale: 0.3, volumeScale: 0.6, particleScale: 0.5 },
];

let activeId = "stim";
let cached: EmotionProfile[] = DEFAULTS;

export async function loadEmotionProfiles(): Promise<EmotionProfile[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return DEFAULTS;
  try {
    const parsed = JSON.parse(raw) as EmotionProfile[];
    cached = parsed.length ? parsed : DEFAULTS;
    return cached;
  } catch {
    return DEFAULTS;
  }
}

export async function saveEmotionProfiles(profiles: EmotionProfile[]): Promise<void> {
  cached = profiles;
  await AsyncStorage.setItem(KEY, JSON.stringify(profiles));
}

export function getActiveEmotionProfileId(): string {
  return activeId;
}

export function setActiveEmotionProfileId(id: string): void {
  activeId = id;
}

export function resolveActiveEmotionProfile(): EmotionProfile {
  return cached.find((p) => p.id === activeId) ?? DEFAULTS[0]!;
}

export function updateActiveEmotionScalars(partial: Partial<Omit<EmotionProfile, "id" | "name">>): void {
  const active = resolveActiveEmotionProfile();
  const next = { ...active, ...partial };
  cached = cached.map((p) => (p.id === active.id ? next : p));
  void saveEmotionProfiles(cached);
}

void loadEmotionProfiles();
