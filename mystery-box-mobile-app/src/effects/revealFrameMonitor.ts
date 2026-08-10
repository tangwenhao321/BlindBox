import { markRevealPerformanceDegraded } from "./sessionPerf";
import { degradeRevealDriverTier } from "./revealDriverTier";
import { resolveFpsBucket } from "./revealTelemetrySchema";
import { trackEffectEvent } from "./telemetry";
export type RevealFrameMonitorOpts = {
  /** Treat frames slower than this as janky (default 34ms ≈ 30fps). */
  slowFrameThresholdMs?: number;
};

/** 揭晓过程中采样帧间隔，掉帧过多则触发会话降级；连续 stuck 触发 render heal */
export function createRevealFrameMonitor(
  onDegrade?: () => void,
  onStuckHeal?: () => void,
  opts?: RevealFrameMonitorOpts,
) {
  const slowThreshold = opts?.slowFrameThresholdMs ?? 34;
  let rafId = 0;
  let last = 0;
  let slowFrames = 0;
  let stuckPasses = 0;
  let frameSamples = 0;
  let running = false;

  const tick = (now: number) => {
    if (!running) return;
    if (last > 0) {
      frameSamples += 1;
      const delta = now - last;
      if (delta > slowThreshold) slowFrames += 1;
      if (delta > 120) {
        stuckPasses += 1;
        if (stuckPasses >= 3) {
          stuckPasses = 0;
          onStuckHeal?.();
        }
      } else {
        stuckPasses = 0;
      }
    }
    last = now;
    rafId = requestAnimationFrame(tick);
  };

  return {
    start() {
      if (running) return;
      running = true;
      slowFrames = 0;
      frameSamples = 0;
      last = 0;
      rafId = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      if (frameSamples > 0) {
        const ratio = slowFrames / frameSamples;
        trackEffectEvent("reveal_fps_bucket", { fpsBucket: resolveFpsBucket(ratio), slowFrames, frameSamples });
      }
      if (slowFrames >= 10) {
        markRevealPerformanceDegraded();
        degradeRevealDriverTier();
        onDegrade?.();
      }
    },
  };
}
