import type { EffectProfile } from "./config";
import type { RevealPacing } from "./revealSequence";
import { resolveDrawCountRhythmScale } from "./revealAdaptiveRhythm";
import { resolveBehaviorRhythmScale } from "./revealBehaviorProfile";
import { getRevealRefreshRateScale, updateRevealRefreshRateFromFps } from "./revealRefreshRate";
import { temporaryTurboScale } from "./revealTemporaryTurbo";
import { getRuntimeRevealRhythmPreset, rhythmPresetScale } from "../utils/revealSettings";
import { mergeCeremonyTemplateScale } from "./revealCeremonyTemplate";
import { resolveEffectiveCeremonyTemplateId } from "./revealCeremonyTemplateAuto";
import { resolveActiveEmotionProfile } from "./revealEmotionProfiles";
import { getRevealRemoteConfig } from "./revealRemote";
import { resolveMemberRevealPerks } from "./revealMemberPerks";
import { resolveOrientationEffectScale } from "./revealOrientationAdapt";

export { updateRevealRefreshRateFromFps };

export const REVEAL_SOUND_SYNC = {
  afterBoxTeaserMs: 380,
  flashPeakMs: 90,
  prizeFlipMs: 160,
} as const;

export function scaleRevealDuration(
  ms: number,
  pacing: RevealPacing,
  opts: {
    reduceMotion?: boolean;
    lowPerf?: boolean;
    totalReveals?: number;
    revealIndex?: number;
    orderId?: string;
    accelerateScale?: number;
  },
): number {
  if (opts.reduceMotion) return Math.min(ms, 100);
  let scaled = ms;
  if (pacing === "fast") scaled = Math.round(ms * 0.85);
  else if (pacing === "ceremony") scaled = Math.round(ms * 1.35);
  else if (pacing === "finale") scaled = Math.round(ms * 1.12);
  if (opts.lowPerf) scaled = Math.round(scaled * 0.72);
  if (opts.totalReveals != null && opts.revealIndex != null) {
    scaled = Math.round(scaled * resolveDrawCountRhythmScale(opts.totalReveals, opts.revealIndex));
  }
  scaled = Math.round(scaled * rhythmPresetScale(getRuntimeRevealRhythmPreset()));
  scaled = Math.round(scaled * resolveBehaviorRhythmScale());
  scaled = Math.round(scaled * getRevealRefreshRateScale());
  scaled = Math.round(scaled * temporaryTurboScale(opts.orderId));
  if (opts.accelerateScale != null && opts.accelerateScale > 0 && opts.accelerateScale < 1) {
    scaled = Math.round(scaled * opts.accelerateScale);
  }
  scaled = mergeCeremonyTemplateScale(scaled, resolveEffectiveCeremonyTemplateId());
  scaled = Math.round(scaled * resolveActiveEmotionProfile().chargeScale);
  scaled = Math.round(scaled * resolveMemberRevealPerks().timingScale);
  scaled = resolveOrientationEffectScale(scaled);
  return scaled;
}

export function resolveFlipSpringMs(
  pacing: RevealPacing,
  isUltimate: boolean,
  isCeremony: boolean,
): number {
  if (isUltimate) return 640;
  if (isCeremony || pacing === "ceremony" || pacing === "finale") return 560;
  return 460;
}

export function getStepIdleMs(
  profile: EffectProfile,
  pacing: RevealPacing,
  opts: { reduceMotion?: boolean; lowPerf?: boolean },
): number {
  const base =
    profile.revealDelayMs *
    (pacing === "ceremony" ? 0.55 : pacing === "finale" ? 0.48 : pacing === "fast" ? 0.36 : 0.38);
  return scaleRevealDuration(
    Math.round(base) + (pacing === "ceremony" ? 680 : pacing === "finale" ? 720 : pacing === "fast" ? 520 : 380),
    pacing,
    opts,
  );
}

export function resolveHoldDuration(
  pacing: RevealPacing,
  profile: EffectProfile,
  opts: { reduceMotion?: boolean; lowPerf?: boolean; totalReveals?: number; revealIndex?: number },
  finaleHoldMsExtra = 300,
): number {
  const timingOpts = opts;
  const chargeMs = scaleRevealDuration(profile.chargeMs, pacing, timingOpts);
  const burstStart = chargeMs > 0 && (pacing === "ceremony" || pacing === "finale") ? chargeMs : 0;
  const popDelay = scaleRevealDuration(140, pacing, timingOpts);
  const flipDelay = scaleRevealDuration(80, pacing, timingOpts);
  const flipSpringMs = resolveFlipSpringMs(pacing, false, pacing === "ceremony" || pacing === "finale");
  const minHoldMs = popDelay + flipDelay + flipSpringMs;
  const baseHold = scaleRevealDuration(Math.round(profile.revealDelayMs * 0.42), pacing, timingOpts);
  const finaleMin = 1400 + Math.max(0, finaleHoldMsExtra);
  const multiDraw = (opts.totalReveals ?? 1) > 1;
  const normalMin =
    pacing === "fast"
      ? multiDraw
        ? 220
        : 480
      : pacing === "normal" && multiDraw
        ? 520
        : 900;
  const hold = Math.max(
    baseHold,
    minHoldMs + burstStart,
    pacing === "ceremony" || pacing === "finale" ? finaleMin : normalMin,
  ) + resolveMemberRevealPerks().extraHoldMs;
  if (multiDraw && pacing === "fast") {
    return Math.min(hold, 360);
  }
  if (multiDraw && pacing === "normal") {
    return Math.min(hold, 720);
  }
  if (multiDraw && (pacing === "finale" || pacing === "ceremony")) {
    return Math.min(hold, 1100);
  }
  return hold;
}
