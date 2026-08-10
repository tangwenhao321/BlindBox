import { describe, expect, it, beforeEach } from "vitest";
import {
  hasOrderRevealBeenSeen,
  markOrderRevealSeen,
  prepareFreshRevealPlayback,
  resetOrderRevealSessionForTests,
  tryAcquireAutoPlay,
  tryAcquireManualReplay,
  releaseRevealSession,
  validateRevealPrizes,
} from "./revealOrchestrator";

describe("revealOrchestrator", () => {
  beforeEach(() => {
    resetOrderRevealSessionForTests();
  });

  it("allows first auto play and blocks second source", () => {
    expect(tryAcquireAutoPlay("o1", "modal", { prizes: [{ id: "p1", name: "A", price: 1 }] })).toBe(
      "allowed",
    );
    expect(tryAcquireAutoPlay("o1", "details", { prizes: [{ id: "p1", name: "A", price: 1 }] })).toBe(
      "blocked_by_active",
    );
  });

  it("blocks seen orders", () => {
    markOrderRevealSeen("o2");
    expect(tryAcquireAutoPlay("o2", "modal")).toBe("blocked_seen");
  });

  it("blocks pending payment", () => {
    expect(tryAcquireAutoPlay("o3", "modal", { pendingPayment: true })).toBe("blocked_pending_payment");
  });

  it("validates prizes", () => {
    expect(validateRevealPrizes([])).toBe(false);
    expect(validateRevealPrizes([{ id: "x", name: "y", price: 0 }])).toBe(true);
  });

  it("manual replay blocked while playing same order", () => {
    tryAcquireAutoPlay("o4", "details", { prizes: [{ id: "p", name: "P", price: 0 }] });
    expect(tryAcquireManualReplay("o4", "details")).toBe(false);
    releaseRevealSession("o4", "complete");
    expect(tryAcquireManualReplay("o4", "details")).toBe(true);
  });

  it("tracks seen state", () => {
    expect(hasOrderRevealBeenSeen("o5")).toBe(false);
    markOrderRevealSeen("o5");
    expect(hasOrderRevealBeenSeen("o5")).toBe(true);
  });

  it("prepareFreshRevealPlayback clears seen so reveal can play again", () => {
    markOrderRevealSeen("o6");
    prepareFreshRevealPlayback("o6");
    expect(hasOrderRevealBeenSeen("o6")).toBe(false);
    expect(
      tryAcquireAutoPlay("o6", "modal", { prizes: [{ id: "p1", name: "A", price: 1 }] }),
    ).toBe("allowed");
  });
});
