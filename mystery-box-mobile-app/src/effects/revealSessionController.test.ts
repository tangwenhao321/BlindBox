import { describe, expect, it, beforeEach } from "vitest";
import {
  resetOrderRevealSessionForTests,
  tryAcquireAutoPlay,
  markOrderRevealSeen,
} from "./revealOrchestrator";
import { resolveRevealBootAction } from "./revealSessionController";
import { computeInterRevealGapMs } from "./revealSequenceEngine";

describe("resolveRevealBootAction", () => {
  beforeEach(() => {
    resetOrderRevealSessionForTests();
  });

  it("allows play for fresh order", () => {
    const decision = resolveRevealBootAction("order-1", "modal", {
      prizes: [{ id: "p1", name: "A", price: 1 }],
    });
    expect(decision.action).toBe("play");
  });

  it("skips to settlement when already seen on modal", () => {
    markOrderRevealSeen("order-2");
    const decision = resolveRevealBootAction("order-2", "modal", {
      prizes: [{ id: "p1", name: "A", price: 1 }],
      preferSettlementOnSeen: true,
    });
    expect(decision.action).toBe("skip_to_settlement");
  });

  it("replays when already seen but settlement skip is disabled", () => {
    markOrderRevealSeen("order-2b");
    const decision = resolveRevealBootAction("order-2b", "modal", {
      prizes: [{ id: "p1", name: "A", price: 1 }],
      preferSettlementOnSeen: false,
    });
    expect(decision.action).toBe("play");
  });

  it("queues modal when another order is active", () => {
    tryAcquireAutoPlay("active-order", "modal", {
      prizes: [{ id: "p1", name: "A", price: 1 }],
    });
    const decision = resolveRevealBootAction("order-3", "modal", {
      prizes: [{ id: "p2", name: "B", price: 1 }],
    });
    expect(decision.action).toBe("queue");
  });

  it("skips details to prizes when blocked by active session", () => {
    tryAcquireAutoPlay("active-order", "modal", {
      prizes: [{ id: "p1", name: "A", price: 1 }],
    });
    const decision = resolveRevealBootAction("order-4", "details", {
      prizes: [{ id: "p2", name: "B", price: 1 }],
    });
    expect(decision.action).toBe("skip_to_prizes");
  });

  it("boot play path aligns with positive inter-reveal gap for multi-draw", () => {
    const products = Array.from({ length: 4 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, price: 1 }));
    const decision = resolveRevealBootAction("order-gap", "modal", { prizes: products });
    expect(decision.action).toBe("play");
    expect(computeInterRevealGapMs(1, products)).toBeGreaterThan(0);
    expect(computeInterRevealGapMs(2, products)).toBeGreaterThan(0);
  });
});
