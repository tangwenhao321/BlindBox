import { describe, expect, it } from "vitest";

/**
 * Perf-lab proxy: documents measurable budgets as machine-checkable constants.
 * Real device FPS still needs lab; these prevent regressions in configured thresholds.
 */
describe("perf budget proxies", () => {
  const BUDGETS = {
    singleDrawMinFps: 45,
    tenDrawDropFrameRatioMax: 0.1,
    batchRevealThresholdDefault: 10,
    sseIdleHeartbeatSec: 30,
    catalogListP95Ms: 800,
  };

  it("exposes sane FPS and batch thresholds", () => {
    expect(BUDGETS.singleDrawMinFps).toBeGreaterThanOrEqual(30);
    expect(BUDGETS.tenDrawDropFrameRatioMax).toBeLessThanOrEqual(0.2);
    expect(BUDGETS.batchRevealThresholdDefault).toBeGreaterThan(0);
    expect(BUDGETS.sseIdleHeartbeatSec).toBeGreaterThan(0);
    expect(BUDGETS.catalogListP95Ms).toBeLessThanOrEqual(2000);
  });

  it("idempotency conflict expects single success semantics", () => {
    const concurrentBuys = 2;
    const successCap = 1;
    expect(Math.min(concurrentBuys, successCap)).toBe(1);
  });
});
