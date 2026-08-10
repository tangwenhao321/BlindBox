import { Platform } from "react-native";
import { getRuntimeRevealHapticEnabled, getRuntimeRevealSoundEnabled } from "../utils/revealSettings";

export type RevealSystemAdapt = {
  muteSound: boolean;
  muteHaptic: boolean;
  volumeScale: number;
};

let cached: RevealSystemAdapt = { muteSound: false, muteHaptic: false, volumeScale: 1 };

export function getRevealSystemAdapt(): RevealSystemAdapt {
  return cached;
}

export async function refreshRevealSystemAdapt(): Promise<RevealSystemAdapt> {
  const muteSound = !getRuntimeRevealSoundEnabled();
  const muteHaptic = !getRuntimeRevealHapticEnabled();
  cached = {
    muteSound,
    muteHaptic,
    volumeScale: muteSound ? 0 : Platform.OS === "ios" ? 0.95 : 1,
  };
  return cached;
}

export function resetRevealSystemAdaptForTests(): void {
  cached = { muteSound: false, muteHaptic: false, volumeScale: 1 };
}
