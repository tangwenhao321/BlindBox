import type { RevealPacing } from "./revealSequence";
import { scaleRevealDuration, resolveFlipSpringMs } from "./revealTiming";
import type { CeremonyTier } from "./ceremonyTier";
import { isPremiumCeremony, isUltimateCeremony } from "./ceremonyTier";
import { alignRevealPhaseStart } from "./revealPhaseAlign";

export type ExpoRevealTiming = {
  teaserMs: number;
  chargeMs: number;
  phase1Ms: number;
  flipMs: number;
  holdMs: number;
  totalMs: number;
  phaseAlignMs: number;
};

/** Expo Go 揭晓时间轴（与 ExpoGoRevealOverlay 动画阶段对齐） */
export function getExpoRevealTimeline(
  pacing: RevealPacing,
  opts: {
    showBoxTeaser: boolean;
    reduceMotion?: boolean;
    ceremony?: CeremonyTier;
    teaserVariant?: "full" | "mini";
    revealIndex?: number;
    totalReveals?: number;
    accelerateScale?: number;
    orderId?: string;
  },
): ExpoRevealTiming {
  const timingOpts = {
    reduceMotion: !!opts.reduceMotion,
    lowPerf: false,
    revealIndex: opts.revealIndex,
    totalReveals: opts.totalReveals,
    accelerateScale: opts.accelerateScale,
    orderId: opts.orderId,
  };
  if (opts.reduceMotion) {
    return { teaserMs: 0, chargeMs: 0, phase1Ms: 180, flipMs: 200, holdMs: 240, totalMs: 620, phaseAlignMs: 0 };
  }

  const isUltimate = opts.ceremony ? isUltimateCeremony(opts.ceremony) : false;
  const isCeremony = opts.ceremony ? isPremiumCeremony(opts.ceremony) : false;

  const chargeMs =
    pacing === "fast" && opts.showBoxTeaser
      ? scaleRevealDuration(320, pacing, timingOpts)
      : isUltimate
        ? scaleRevealDuration(920, pacing, timingOpts)
        : opts.ceremony === "TREASURE_LEGEND"
          ? scaleRevealDuration(640, pacing, timingOpts)
          : scaleRevealDuration(420, pacing, timingOpts);

  const teaserBase = opts.teaserVariant === "mini" ? 460 : 700;
  const teaserMs = opts.showBoxTeaser ? scaleRevealDuration(teaserBase, pacing, timingOpts) : 0;
  const phase1Ms = opts.showBoxTeaser
    ? scaleRevealDuration(620, pacing, timingOpts)
    : scaleRevealDuration(
        pacing === "ceremony" ? 1100 : pacing === "fast" ? 260 : pacing === "finale" ? 980 : 760,
        pacing,
        timingOpts,
      );
  const flipMs = scaleRevealDuration(
    resolveFlipSpringMs(pacing, isUltimate, isCeremony),
    pacing,
    timingOpts,
  );
  const holdMs = scaleRevealDuration(
    pacing === "ceremony" ? 1100 : pacing === "finale" ? 900 : pacing === "fast" ? 880 : 720,
    pacing,
    timingOpts,
  );
  const phaseAlignMs =
    opts.revealIndex != null && opts.totalReveals != null
      ? alignRevealPhaseStart(opts.revealIndex, opts.totalReveals).cardFlipDelayMs
      : 0;

  return {
    teaserMs,
    chargeMs: pacing === "fast" && !opts.showBoxTeaser ? 0 : chargeMs,
    phase1Ms,
    flipMs,
    holdMs,
    phaseAlignMs,
    totalMs: teaserMs + chargeMs + phase1Ms + flipMs + holdMs + phaseAlignMs,
  };
}
