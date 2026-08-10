import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import type { PrizeTier } from "./config";
import { normalizeCeremonyTier } from "./ceremonyTier";
import { getRevealRemoteConfig } from "./revealRemote";
import { getRuntimeRevealHapticEnabled } from "../utils/revealSettings";
import { trackEffectEvent } from "./telemetry";

const queue: Array<() => Promise<void>> = [];
let draining = false;

async function drainQueue() {
  if (draining) return;
  draining = true;
  while (queue.length) {
    const job = queue.shift();
    if (job) await job();
  }
  draining = false;
}

export function enqueueRevealHaptic(fn: () => Promise<void>) {
  queue.push(fn);
  void drainQueue();
}

export async function playRevealHaptic(tier: PrizeTier) {
  if (!getRuntimeRevealHapticEnabled()) return;
  if (!getRevealRemoteConfig().vibrateFallbackEnabled) return;
  const ceremony = normalizeCeremonyTier(tier);
  try {
    if (ceremony === "TREASURE_PEERLESS" || ceremony === "PEERLESS") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (ceremony === "TREASURE_LEGEND") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (ceremony === "HIDDEN") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    trackEffectEvent("reveal_haptic_play", { tier, platform: Platform.OS });
  } catch {
    trackEffectEvent("reveal_haptic_failed", { tier });
  }
}

export function playRevealHapticQueued(tier: PrizeTier) {
  enqueueRevealHaptic(() => playRevealHaptic(tier));
}

export function playAccelerateHapticPulse(tier: 0 | 1 | 2): void {
  if (tier === 0 || !getRuntimeRevealHapticEnabled()) return;
  if (tier === 2) {
    playRevealHapticQueued("TREASURE_LEGEND");
    return;
  }
  playRevealHapticQueued("HIDDEN");
}

export function resetRevealHapticQueueForTests() {
  queue.length = 0;
  draining = false;
}
