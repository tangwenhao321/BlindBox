import { describe, expect, it, beforeEach } from "vitest";
import { setRevealRemoteConfig } from "./revealRemote";
import { isTetCalendarWindow, resolveFestivalTint, shouldReplaceFestivalBgm, shouldShowFestivalOverlay } from "./revealFestivalBundle";

describe("resolveFestivalTint", () => {
  beforeEach(() => {
    setRevealRemoteConfig(null);
  });

  it("returns tet palette for lunar-new-year templates", () => {
    setRevealRemoteConfig({ festivalTemplateId: "tet-2026" });
    expect(resolveFestivalTint()?.kind).toBe("tet");
  });

  it("returns limited gold when priority is active", () => {
    setRevealRemoteConfig({ limitedThemePriority: 8, limitedThemeId: "party" });
    expect(resolveFestivalTint()?.kind).toBe("limited");
  });

  it("is idle without festival or limited theme", () => {
    expect(resolveFestivalTint()).toBeNull();
  });

  it("treats January as Tet calendar window and swaps BGM", () => {
    const tet = Date.UTC(2026, 0, 28);
    expect(isTetCalendarWindow(tet)).toBe(true);
    expect(shouldReplaceFestivalBgm(tet)).toBe(true);
    expect(resolveFestivalTint(tet)?.kind).toBe("tet");
  });

  it("keeps overlay available on test variant even off-season", () => {
    const august = Date.UTC(2026, 7, 17);
    expect(isTetCalendarWindow(august)).toBe(false);
    const overlay = shouldShowFestivalOverlay(august);
    expect(overlay).toBe(process.env.EXPO_PUBLIC_APP_VARIANT === "test");
  });
});
