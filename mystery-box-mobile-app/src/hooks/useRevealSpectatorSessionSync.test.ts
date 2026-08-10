import { describe, expect, it } from "vitest";
import { resolveFinalSpectatorPhase } from "./useRevealSpectatorSessionSync";

describe("useRevealSpectatorSessionSync helpers", () => {
  it("resolveFinalSpectatorPhase keeps summary or falls back to idle", () => {
    expect(resolveFinalSpectatorPhase("summary")).toBe("summary");
    expect(resolveFinalSpectatorPhase("playing")).toBe("idle");
    expect(resolveFinalSpectatorPhase(null)).toBe("idle");
  });
});
