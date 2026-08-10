import { AppState, type AppStateStatus } from "react-native";
import { getRevealRecordingSafeMode } from "../utils/revealSettings";
import { toast } from "../utils/toast";
import i18n from "../i18n";

let runtimeRecordingSafe = false;
let screenshotFlashReduceUntil = 0;
let recordingStartedAt: number | null = null;

export async function refreshRevealRecordingSafeMode() {
  runtimeRecordingSafe = await getRevealRecordingSafeMode();
  return runtimeRecordingSafe;
}

export function isRevealRecordingSafeMode() {
  return runtimeRecordingSafe;
}

export function markRevealScreenshotTaken(): void {
  screenshotFlashReduceUntil = Date.now() + 800;
}

export function resolveRecordingSafeRevealFlags() {
  const screenshotReduce = Date.now() < screenshotFlashReduceUntil;
  if (!runtimeRecordingSafe && !screenshotReduce) {
    return { hideTicker: false, reduceFlash: false, reduceParticles: false, hideWatermark: false };
  }
  return {
    hideTicker: runtimeRecordingSafe,
    reduceFlash: runtimeRecordingSafe || screenshotReduce,
    reduceParticles: runtimeRecordingSafe || screenshotReduce,
    hideWatermark: runtimeRecordingSafe,
  };
}

export function startRevealRecordingMonitor(): () => void {
  const onChange = (next: AppStateStatus) => {
    if (next === "active" && recordingStartedAt != null) {
      const elapsed = Date.now() - recordingStartedAt;
      if (elapsed > 60_000) {
        toast.revealHint(
          i18n.t("revealOverlay.recordingLongHint", { defaultValue: "Long screen recording may affect smooth playback." }),
        );
      }
    }
  };
  const sub = AppState.addEventListener("change", onChange);
  recordingStartedAt = Date.now();
  return () => {
    sub.remove();
    recordingStartedAt = null;
  };
}

void refreshRevealRecordingSafeMode();

export function notifyRevealScreenshotForRecordingMode(): void {
  markRevealScreenshotTaken();
}

void (async () => {
  try {
    const ScreenCapture = await import("expo-screen-capture");
    ScreenCapture.addScreenshotListener(() => {
      notifyRevealScreenshotForRecordingMode();
    });
  } catch {
    // expo-screen-capture unavailable in Expo Go or web builds
  }
})();
