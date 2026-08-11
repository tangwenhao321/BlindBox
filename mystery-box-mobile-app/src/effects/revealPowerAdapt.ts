import { AppState, type AppStateStatus } from "react-native";
import { detectLowPerfDevice } from "./deviceProfile";
import { markRevealPerformanceDegraded } from "./sessionPerf";

let powerSaverActive = false;
let subscribed = false;

export function isRevealPowerSaverActive(): boolean {
  return powerSaverActive;
}

/**
 * Prefer expo-battery low-power mode when the native module is present;
 * otherwise fall back to the low-end device heuristic.
 *
 * Install note (optional): `npx expo install expo-battery` enables Low Power Mode /
 * battery-level detection. Keep require() dynamic so builds without the package still work.
 * `useRevealDevice` already calls `detectLowPerfDevice` / `refreshRevealPowerAdapt`.
 */
export async function refreshRevealPowerAdapt(): Promise<boolean> {
  try {
    // Dynamic require keeps expo-battery optional (not a hard dependency).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Battery = require("expo-battery") as {
      isLowPowerModeEnabledAsync?: () => Promise<boolean>;
      getBatteryLevelAsync?: () => Promise<number>;
      addLowPowerModeListener?: (listener: (event: { lowPowerMode: boolean }) => void) => { remove: () => void };
    };
    if (typeof Battery.isLowPowerModeEnabledAsync === "function") {
      const lowPower = await Battery.isLowPowerModeEnabledAsync();
      let lowBattery = false;
      if (typeof Battery.getBatteryLevelAsync === "function") {
        const level = await Battery.getBatteryLevelAsync();
        lowBattery = Number.isFinite(level) && level >= 0 && level < 0.2;
      }
      powerSaverActive = lowPower || lowBattery;
      if (powerSaverActive) markRevealPerformanceDegraded();
      ensureAppStateHook();
      return powerSaverActive;
    }
  } catch {
    /* module absent — heuristic below */
  }
  powerSaverActive = detectLowPerfDevice();
  if (powerSaverActive) markRevealPerformanceDegraded();
  ensureAppStateHook();
  return powerSaverActive;
}

function ensureAppStateHook() {
  if (subscribed) return;
  subscribed = true;
  AppState.addEventListener("change", (next: AppStateStatus) => {
    if (next === "active") {
      void refreshRevealPowerAdapt();
    }
  });
}
