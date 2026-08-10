import { describe, expect, it } from "vitest";
import { listEmptyWhenOk, shouldShowListSkeleton } from "./listScreenHelpers";

describe("listScreenHelpers", () => {
  it("listEmptyWhenOk hides empty when loadError is set", () => {
    expect(listEmptyWhenOk("failed", null)).toBeNull();
    expect(listEmptyWhenOk(null, null)).toBeNull();
  });

  it("shouldShowListSkeleton is true only on initial empty load", () => {
    expect(shouldShowListSkeleton(true, 0, null)).toBe(true);
    expect(shouldShowListSkeleton(true, 0, null, true)).toBe(false);
    expect(shouldShowListSkeleton(true, 2, null)).toBe(false);
    expect(shouldShowListSkeleton(false, 0, "err")).toBe(false);
  });
});
