import { describe, expect, it } from "vitest";
import { getExpoRevealTimeline } from "./expoRevealTiming";

describe("getExpoRevealTimeline", () => {
  it("fast middle reveal lasts longer than flip+phase1 alone", () => {
    const t = getExpoRevealTimeline("fast", { showBoxTeaser: false });
    expect(t.totalMs).toBeGreaterThanOrEqual(t.phase1Ms + t.flipMs + t.holdMs);
    expect(t.totalMs).toBeGreaterThan(t.phase1Ms + t.flipMs);
  });

  it("first reveal with box teaser is longest phase", () => {
    const first = getExpoRevealTimeline("normal", { showBoxTeaser: true });
    const mid = getExpoRevealTimeline("fast", { showBoxTeaser: false });
    expect(first.totalMs).toBeGreaterThan(mid.totalMs);
  });
});
