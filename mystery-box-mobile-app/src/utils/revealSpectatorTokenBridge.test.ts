import { describe, expect, it, beforeEach } from "vitest";
import {
  clearRevealSpectatorShareToken,
  getRevealSpectatorShareToken,
  setRevealSpectatorShareToken,
} from "./revealSpectatorTokenBridge";

describe("revealSpectatorTokenBridge", () => {
  beforeEach(() => {
    clearRevealSpectatorShareToken();
  });

  it("stores token keyed by orderId", () => {
    setRevealSpectatorShareToken("order-1", "tok-a");
    expect(getRevealSpectatorShareToken("order-1")).toBe("tok-a");
    expect(getRevealSpectatorShareToken("order-2")).toBeNull();
  });

  it("clears token for matching order", () => {
    setRevealSpectatorShareToken("order-1", "tok-a");
    clearRevealSpectatorShareToken("order-1");
    expect(getRevealSpectatorShareToken("order-1")).toBeNull();
  });
});
