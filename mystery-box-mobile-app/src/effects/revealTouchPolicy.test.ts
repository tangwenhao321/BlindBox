import { describe, expect, it } from "vitest";
import {
  isFullScreenSkipAllowed,
  resolveAccelerateSpeedLabel,
  resolveRevealTouchPhase,
} from "./revealTouchPolicy";

describe("revealTouchPolicy", () => {
  it("allows full-screen skip during precharge", () => {
    expect(resolveRevealTouchPhase(0, "guarded", 0)).toBe("precharge");
    expect(isFullScreenSkipAllowed("precharge")).toBe(true);
  });

  it("guards flip and burst windows for premium tiers", () => {
    expect(resolveRevealTouchPhase(0.5, "guarded", 0)).toBe("guarded");
    expect(resolveRevealTouchPhase(0.2, "guarded", 0.5)).toBe("guarded");
    expect(isFullScreenSkipAllowed("guarded")).toBe(false);
  });

  it("always allows full-screen skip for normal guard tier", () => {
    expect(resolveRevealTouchPhase(0.5, "normal", 0.9)).toBe("precharge");
  });

  it("maps accelerate labels to tiers", () => {
    expect(resolveAccelerateSpeedLabel(true, 0.2, 1)).toBe("1.5x");
    expect(resolveAccelerateSpeedLabel(true, 0.95, 2)).toBe("2.5x");
    expect(resolveAccelerateSpeedLabel(false, 0, 0)).toBe(null);
  });
});
