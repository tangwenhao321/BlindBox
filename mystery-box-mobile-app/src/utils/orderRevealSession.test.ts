import { describe, expect, it } from "vitest";
import {
  hasOrderRevealBeenSeen,
  markOrderRevealSeen,
  resetOrderRevealSessionForTests,
} from "./orderRevealSession";

describe("orderRevealSession", () => {
  it("tracks reveal completion per order id", () => {
    resetOrderRevealSessionForTests();
    expect(hasOrderRevealBeenSeen("ord-1")).toBe(false);
    markOrderRevealSeen("ord-1");
    expect(hasOrderRevealBeenSeen("ord-1")).toBe(true);
    expect(hasOrderRevealBeenSeen("ord-2")).toBe(false);
  });
});
