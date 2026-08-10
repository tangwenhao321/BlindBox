export const REVEAL_TELEMETRY_EVENTS = {
  skipOne: "reveal_skip_one",
  skipRemaining: "reveal_skip_remaining",
  accelerateTier1: "reveal_accelerate_tier1",
  accelerateTier2: "reveal_accelerate_tier2",
  pause: "reveal_pause",
  guardedTap: "reveal_guarded_tap",
  gestureLock: "reveal_gesture_lock",
  recordingSafe: "reveal_recording_safe",
  batchBeatComplete: "reveal_batch_beat_complete",
  achievementShow: "reveal_achievement_show",
  shareChannel: "share_reveal",
  renderHeal: "reveal_render_heal",
  audioFocusLost: "reveal_audio_focus_lost",
} as const;

export type RevealTelemetryPayload = {
  orderId?: string;
  revealIndex?: number;
  source?: string;
  variant?: string;
  configVersion?: string;
  skipReason?: string;
  alertTier?: "ok" | "warn" | "severe" | "critical";
  fpsBucket?: "smooth" | "ok" | "janky" | "stuck";
  deviceTier?: "low" | "mid" | "high";
};

export function resolveFpsBucket(slowFrameRatio: number): RevealTelemetryPayload["fpsBucket"] {
  if (slowFrameRatio >= 0.45) return "stuck";
  if (slowFrameRatio >= 0.25) return "janky";
  if (slowFrameRatio >= 0.12) return "ok";
  return "smooth";
}

export function buildRevealTelemetryPayload(
  base: RevealTelemetryPayload,
  extra?: Record<string, unknown>,
) {
  return { ...base, ...extra };
}
