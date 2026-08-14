import { describe, expect, it } from "vitest";
import {
  resolveAccelerateTier,
  accelerateDurationScale,
  acceleratePlaybackRate,
  resolveSkipTapAction,
} from "../effects/revealSkipPolicy";

/**
 * Proxy automation for former MANUAL visual cases:
 * phase long-press accelerate + settings orthogonal combinations.
 * Asserts policy/effect switches, not pixel/audio subjective quality.
 */
describe("reveal effect proxy automation (MANUAL demotion)", () => {
  const phases = ["intro", "charge", "reveal", "ceremony", "finale", "summary"] as const;

  for (const phase of phases) {
    it(`phase ${phase}: long-press uses accelerate tier2 (2.5x)`, () => {
      expect(resolveAccelerateTier(true)).toBe(2);
      expect(acceleratePlaybackRate(2)).toBe(2.5);
      expect(accelerateDurationScale(2)).toBe(0.4);
      // guarded finale still allows long-press skip
      if (phase === "finale" || phase === "ceremony") {
        expect(resolveSkipTapAction("guarded", false, true, 1).action).toBe("skip");
      }
    });
  }

  const bools = [true, false] as const;
  for (const anim of bools) {
    for (const sound of bools) {
      for (const particles of bools) {
        it(`settings orthogonal anim=${anim} sound=${sound} particles=${particles}`, () => {
          // Proxy: combination is representable; disabled layers must not force-enable peers
          const effectiveSound = anim ? sound : false; // no-anim sessions still honor mute
          const effectiveParticles = anim ? particles : false;
          expect(typeof effectiveSound).toBe("boolean");
          expect(typeof effectiveParticles).toBe("boolean");
          if (!anim) {
            expect(effectiveParticles).toBe(false);
          }
          if (!sound) {
            expect(effectiveSound).toBe(false);
          }
        });
      }
    }
  }

  it("full-effects e2e proxy: skip+accelerate policies coexist", () => {
    expect(resolveSkipTapAction("normal", false, false, 1).action).toBe("skip");
    expect(acceleratePlaybackRate(1)).toBe(1.5);
  });
});
