import { markRevealPerformanceDegraded } from "./sessionPerf";
import { trackEffectEvent } from "./telemetry";

const WINDOW = 40;
const completions: { completed: boolean; skipped: boolean }[] = [];

export type RevealAlertTier = "ok" | "warn" | "severe" | "critical";

export function resolveRevealAlertTier(skipRate: number, completeRate: number): RevealAlertTier {
  if (skipRate > 0.7 || completeRate < 0.2) return "critical";
  if (skipRate > 0.55 || completeRate < 0.35) return "severe";
  if (skipRate > 0.4 || completeRate < 0.5) return "warn";
  return "ok";
}

export function recordRevealCompletion(completed: boolean, skipped = false): void {
  completions.push({ completed, skipped });
  if (completions.length > WINDOW) completions.shift();
  if (completions.length < 12) return;
  const skipRate = completions.filter((c) => c.skipped).length / completions.length;
  const completeRate = completions.filter((c) => c.completed).length / completions.length;
  const alertTier = resolveRevealAlertTier(skipRate, completeRate);
  if (alertTier === "warn" || alertTier === "severe" || alertTier === "critical") {
    if (alertTier !== "warn") markRevealPerformanceDegraded();
    trackEffectEvent("reveal_telemetry_waterline", {
      skipRate,
      completeRate,
      window: completions.length,
      alertTier,
    });
  }
}

export function resetRevealTelemetryWaterlineForTests(): void {
  completions.length = 0;
}
