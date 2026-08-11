import { describe, expect, it } from "vitest";
import { clampMs, setRevealRemoteConfig, getRevealRemoteConfig } from "./revealRemote";
import { resolvePhaseHandoffMs } from "./revealSequenceEngine";
import { resolvePersonaPack } from "./revealPersonaPack";
import { signRevealPayload, verifyRevealPayload } from "./revealIntegrity";
import { resolveWeeklyPoolId } from "./revealWeeklyContentPool";
import { resolveSolarTermId } from "./revealSolarTermPool";
import { shouldAllowRevealPrefetch, setRevealPrefetchFpsHealthy } from "./revealPrefetchGate";
import {
  connectRevealRoom,
  getRevealRoomProgress,
  getRevealRoomRole,
  leaveRevealSpectatorRoom,
  leaveRevealHostRoom,
  publishRevealRoomProgress,
  publishRevealRoomReaction,
  subscribeRevealRoomReactions,
  subscribeRevealRoomProgress,
} from "./revealSocialRoom";
import { computeInterRevealGapMs } from "../effects/revealSequenceEngine";
import { countDryStreakReveals } from "./revealCopyPool";

describe("reveal regression bundle", () => {
  it("clampMs enforces upper bound", () => {
    expect(clampMs(999_999, 0, 8000)).toBe(8000);
    expect(clampMs(-5, 0, 8000)).toBe(0);
  });

  it("remote config caps abusive delay override", () => {
    setRevealRemoteConfig({ delayMsOverride: 999_999 });
    expect(getRevealRemoteConfig().delayMsOverride).toBeLessThanOrEqual(15_000);
  });

  it("phase handoff is non-negative", () => {
    expect(resolvePhaseHandoffMs("fade", "charge")).toBeGreaterThanOrEqual(0);
  });

  it("persona pack resolves newcomer for low play count", () => {
    expect(resolvePersonaPack({ play: 1, skipOne: 0, skipRemaining: 0, accelerateTier1: 0, accelerateTier2: 0, pause: 0, complete: 0, updatedAt: 0 })).toBe("newcomer");
  });

  it("integrity sign/verify roundtrip", () => {
    const payload = { orderId: "o1", productId: "p1" };
    const sig = signRevealPayload(payload);
    expect(verifyRevealPayload(payload, sig)).toBe(true);
    expect(verifyRevealPayload({ ...payload, productId: "p2" }, sig)).toBe(false);
  });

  it("weekly and solar pools resolve ids", () => {
    expect(resolveWeeklyPoolId()).toMatch(/^pool_/);
    expect(resolveSolarTermId()).toBeTruthy();
  });

  it("prefetch gate blocks cellular and low fps", () => {
    expect(shouldAllowRevealPrefetch("cellular")).toBe(false);
    setRevealPrefetchFpsHealthy(false);
    expect(shouldAllowRevealPrefetch("wifi")).toBe(false);
    setRevealPrefetchFpsHealthy(true);
  });

  it("social room progress pub/sub", () => {
    const updates: number[] = [];
    const unsub = subscribeRevealRoomProgress((p) => {
      if (p) updates.push(p.revealIndex);
    });
    publishRevealRoomProgress({ revealIndex: 2, total: 10, phase: "playing" });
    expect(getRevealRoomProgress()?.revealIndex).toBe(2);
    expect(updates[0]).toBe(2);
    unsub();
  });

  it("host leave publishes idle progress", async () => {
    leaveRevealSpectatorRoom();
    const phases: string[] = [];
    const unsub = subscribeRevealRoomProgress((p) => {
      if (p?.phase) phases.push(p.phase);
    });
    await connectRevealRoom("order-host-leave", "token", "host");
    publishRevealRoomProgress({ revealIndex: 1, total: 3, phase: "playing" });
    leaveRevealHostRoom();
    expect(phases).toContain("playing");
    expect(phases.at(-1)).toBe("idle");
    unsub();
  });

  it("spectator role blocks publishRevealRoomProgress", async () => {
    leaveRevealSpectatorRoom();
    await connectRevealRoom("order-spec", "token", "spectator");
    expect(getRevealRoomRole()).toBe("spectator");
    publishRevealRoomProgress({ revealIndex: 5, total: 10, phase: "playing" });
    expect(getRevealRoomProgress()).toBeNull();
    leaveRevealSpectatorRoom();
  });

  it("room reaction pub/sub keeps recent emoji", () => {
    leaveRevealSpectatorRoom();
    const seen: string[] = [];
    const unsub = subscribeRevealRoomReactions((rows) => {
      if (rows[0]) seen.push(rows[0].emoji);
    });
    void connectRevealRoom("order-react", "token", "host");
    publishRevealRoomReaction("★");
    expect(seen.at(-1)).toBe("★");
    unsub();
    leaveRevealSpectatorRoom();
  });

  it("shared inter-reveal gap is positive after first draw", () => {
    const products = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, price: 1 }));
    expect(computeInterRevealGapMs(2, products)).toBeGreaterThan(0);
  });

  it("dry streak counts consecutive general reveals", () => {
    const products = [
      { id: "1", name: "A", price: 1, qualityType: "GENERAL" },
      { id: "2", name: "B", price: 1, qualityType: "GENERAL" },
      { id: "3", name: "C", price: 1, qualityType: "HIDDEN" },
    ];
    expect(countDryStreakReveals(products.slice(0, 2), products)).toBe(2);
  });
});
