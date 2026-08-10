import { describe, expect, it, beforeEach } from "vitest";
import {
  enqueueRevealTask,
  peekRevealQueueHead,
  resetOrderRevealSessionForTests,
  tryAcquireAutoPlay,
} from "./revealOrchestrator";

describe("revealOrchestrator queue", () => {
  beforeEach(() => resetOrderRevealSessionForTests());

  it("queues second order while first is playing", () => {
    expect(tryAcquireAutoPlay("o1", "modal", { prizes: [{ id: "p1" } as never] })).toBe("allowed");
    const ok = enqueueRevealTask("o2", "modal", "modal");
    expect(ok).toBe(false);
    expect(peekRevealQueueHead()?.orderId).toBe("o2");
  });
});
