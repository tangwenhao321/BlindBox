import { describe, expect, it } from "vitest";
import { resolveQueueProgress } from "./queueProgress";

describe("resolveQueueProgress", () => {
  it("returns 0 when queue empty", () => {
    expect(resolveQueueProgress(null)).toBe(0);
    expect(resolveQueueProgress({ position: 0, total: 0, canDraw: false })).toBe(0);
  });

  it("returns 1 when can draw", () => {
    expect(resolveQueueProgress({ position: 1, total: 5, canDraw: true })).toBe(1);
  });

  it("computes fractional progress while waiting", () => {
    expect(resolveQueueProgress({ position: 3, total: 5, canDraw: false })).toBe(0.6);
  });
});
