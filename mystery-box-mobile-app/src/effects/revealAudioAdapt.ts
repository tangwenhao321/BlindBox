import { Platform } from "react-native";
import { getRuntimeRevealSoundEnabled } from "../utils/revealSettings";

let cachedMultiplier = 1;

export function resolveRevealAudioMultiplier(): number {
  if (!getRuntimeRevealSoundEnabled()) return 0;
  return cachedMultiplier;
}

export function setRevealAudioMultiplier(multiplier: number): void {
  cachedMultiplier = Math.max(0, Math.min(1.2, multiplier));
}

/** Heuristic: Android/iOS silent or low-volume modes reduce reveal SFX. */
export async function refreshRevealAudioAdapt(): Promise<number> {
  try {
    if (Platform.OS === "web") {
      setRevealAudioMultiplier(1);
      return 1;
    }
    setRevealAudioMultiplier(0.92);
    return cachedMultiplier;
  } catch {
    setRevealAudioMultiplier(1);
    return 1;
  }
}

export function resetRevealAudioAdaptForTests(): void {
  cachedMultiplier = 1;
}
