import { describe, expect, it } from "vitest";
import { resolveSkipGuardTier, resolveSkipTapAction, accelerateDurationScale } from "./revealSkipPolicy";

describe("revealSkipPolicy", () => {
  it("guards ultimate and finale pacing", () => {
    expect(resolveSkipGuardTier("PEERLESS", "normal")).toBe("guarded");
    expect(resolveSkipGuardTier("GENERAL", "finale")).toBe("guarded");
    expect(resolveSkipGuardTier("GENERAL", "fast")).toBe("normal");
  });

  it("requires pause then skip for guarded tier", () => {
    expect(resolveSkipTapAction("guarded", false, false, 1).action).toBe("pause");
    expect(resolveSkipTapAction("guarded", true, false, 1).action).toBe("skip");
    expect(resolveSkipTapAction("guarded", false, true, 1).action).toBe("skip");
  });

  it("scales accelerate durations", () => {
    expect(accelerateDurationScale(1)).toBe(0.67);
    expect(accelerateDurationScale(2)).toBe(0.4);
  });
});
