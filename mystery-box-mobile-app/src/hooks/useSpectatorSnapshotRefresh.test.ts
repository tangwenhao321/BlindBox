import { describe, expect, it } from "vitest";
import { shouldRefreshSpectatorSnapshot } from "./useSpectatorSnapshotRefresh";

describe("useSpectatorSnapshotRefresh helpers", () => {
  it("shouldRefreshSpectatorSnapshot skips duplicate phases", () => {
    expect(shouldRefreshSpectatorSnapshot("playing", "playing")).toBe(false);
    expect(shouldRefreshSpectatorSnapshot("playing", "summary")).toBe(true);
    expect(shouldRefreshSpectatorSnapshot(null, "playing")).toBe(true);
    expect(shouldRefreshSpectatorSnapshot("gap", undefined)).toBe(false);
  });
});
