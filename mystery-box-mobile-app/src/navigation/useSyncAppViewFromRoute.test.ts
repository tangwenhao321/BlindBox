import { describe, expect, it } from "vitest";
import { shouldSkipStaleRouteSync, shouldSkipDuplicateEntityRouteSync } from "./routeSyncGuards";

describe("shouldSkipStaleRouteSync", () => {
  it("allows sync when memory matches route view", () => {
    expect(shouldSkipStaleRouteSync("boxDetails", "boxDetails", 2, 1)).toBe(false);
  });

  it("allows sync for deep links before any internal navigation", () => {
    expect(shouldSkipStaleRouteSync("boxDetails", "home", 0, 0)).toBe(false);
  });

  it("skips stale box route after in-app back navigation", () => {
    expect(shouldSkipStaleRouteSync("boxDetails", "home", 3, 2)).toBe(true);
    expect(shouldSkipStaleRouteSync("boxDetails", "home", 3, 3)).toBe(true);
  });

  it("skips stale settings route after returning to profile tab", () => {
    expect(shouldSkipStaleRouteSync("settings", "profile", 5, 4)).toBe(true);
    expect(shouldSkipStaleRouteSync("settings", "profile", 5, 5)).toBe(true);
  });
});

describe("shouldSkipDuplicateEntityRouteSync", () => {
  it("skips duplicate box route sync for the same id", () => {
    expect(shouldSkipDuplicateEntityRouteSync("box-1", "box-1")).toBe(true);
  });

  it("allows sync when entity id changes", () => {
    expect(shouldSkipDuplicateEntityRouteSync("box-2", "box-1")).toBe(false);
  });
});
