import { describe, expect, it } from "vitest";
import { resolveDrawCountRhythmScale, resolveBatchRevealWindow } from "./revealAdaptiveRhythm";
import { pickCopyPoolKey, resolveCopyPoolTier, resetCopyPoolRecentForTests } from "./revealCopyPool";
import { isRevealActionLocked, lockRevealActions, resetRevealActionLockForTests } from "./revealActionLock";
import { resolveEffectVariance } from "./revealEffectVariance";
import {
  buildReplayPlaylistIndices,
  computePrizeDuplicateMeta,
  nextReplayPlaylistIndex,
} from "../utils/revealReplayPlaylist";
import type { Product } from "../types";

describe("revealAdaptiveRhythm", () => {
  it("slows short draws and speeds long-draw front half", () => {
    expect(resolveDrawCountRhythmScale(2, 0)).toBeGreaterThanOrEqual(1);
    expect(resolveDrawCountRhythmScale(20, 2)).toBeLessThan(1);
    expect(resolveDrawCountRhythmScale(20, 18)).toBeGreaterThan(1);
  });

  it("enables batch window for large totals", () => {
    expect(resolveBatchRevealWindow(30).enabled).toBe(true);
    expect(resolveBatchRevealWindow(5).enabled).toBe(false);
  });
});

describe("revealCopyPool", () => {
  it("picks stable pool keys", () => {
    resetCopyPoolRecentForTests();
    const a = pickCopyPoolKey("progressGeneral", 4, "o1:0");
    const b = pickCopyPoolKey("progressGeneral", 4, "o1:0");
    expect(a).toBe(b);
    expect(resolveCopyPoolTier("PEERLESS", "ceremony")).toBe("ultimate");
    resetCopyPoolRecentForTests();
  });
});

describe("revealActionLock", () => {
  it("locks actions briefly", () => {
    resetRevealActionLockForTests();
    lockRevealActions(500);
    expect(isRevealActionLocked()).toBe(true);
  });
});

describe("revealEffectVariance", () => {
  it("returns bounded variance", () => {
    const v = resolveEffectVariance("order-1", 3);
    expect(Math.abs(v.particleAngleBias)).toBeLessThanOrEqual(0.35);
  });
});

const sampleProducts = (qualities: string[]): Product[] =>
  qualities.map((qualityType, i) => ({
    id: i < 2 ? "dup" : `p-${i}`,
    name: `Prize ${i}`,
    price: qualityType === "LEGENDARY" ? 200 : 10,
    qualityType,
  }));

describe("revealReplayPlaylist", () => {
  it("builds finale and highlights playlists", () => {
    const products = sampleProducts(["GENERAL", "HIDDEN", "LEGENDARY", "GENERAL"]);
    expect(buildReplayPlaylistIndices(products, "finale")).toEqual([3]);
    const highlights = buildReplayPlaylistIndices(products, "highlights");
    expect(highlights).toContain(1);
    expect(highlights).toContain(2);
    expect(highlights).not.toContain(0);
  });

  it("advances playlist indices", () => {
    const indices = [1, 3, 4];
    expect(nextReplayPlaylistIndex(indices, 1)).toBe(3);
    expect(nextReplayPlaylistIndex(indices, 4)).toBeNull();
  });

  it("marks duplicate prizes", () => {
    const meta = computePrizeDuplicateMeta([
      { id: "a", name: "A", price: 1, qualityType: "GENERAL" },
      { id: "a", name: "A", price: 1, qualityType: "GENERAL" },
      { id: "b", name: "B", price: 1, qualityType: "GENERAL" },
    ]);
    expect(meta[0]).toEqual({ duplicateIndex: 1, duplicateCount: 2 });
    expect(meta[1]).toEqual({ duplicateIndex: 2, duplicateCount: 2 });
    expect(meta[2]).toEqual({});
  });
});
