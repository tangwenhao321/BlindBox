import { describe, expect, it, vi } from "vitest";

vi.mock("./reanimated", () => ({
  Easing: {
    in: (fn: unknown) => fn,
    cubic: "cubic",
    linear: "linear",
    out: (fn: unknown) => fn,
    quad: "quad",
  },
}));

vi.mock("./revealEasing", () => ({
  resolvePhaseEasing: () => "linear",
}));

import { buildChargeTensionDurations } from "./revealChargeCurve";

describe("revealChargeCurve", () => {
  it("splits fast pacing into two equal segments without stall", () => {
    const segments = buildChargeTensionDurations(400, "fast");
    expect(segments.stallMs).toBe(0);
    expect(segments.loop).toBe(true);
    expect(segments.slowMs + segments.accelMs).toBe(400);
  });

  it("adds stall for ceremony pacing on long charge", () => {
    const segments = buildChargeTensionDurations(800, "ceremony");
    expect(segments.stallMs).toBeGreaterThan(0);
    expect(segments.loop).toBe(false);
    expect(segments.slowMs + segments.accelMs + segments.stallMs).toBe(800);
  });

  it("falls back to simple split for short ceremony charge", () => {
    const segments = buildChargeTensionDurations(150, "ceremony");
    expect(segments.stallMs).toBe(0);
    expect(segments.loop).toBe(true);
  });
});
