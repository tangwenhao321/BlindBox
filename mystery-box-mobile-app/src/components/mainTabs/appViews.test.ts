import { describe, expect, it } from "vitest";
import { isTabAppView, TAB_APP_VIEWS, type AppView } from "./appViews";

describe("appViews", () => {
  it("TAB_APP_VIEWS lists all bottom tabs", () => {
    expect(TAB_APP_VIEWS).toEqual(["home", "mall", "warehouse", "profile"]);
  });

  it("isTabAppView narrows tab views only", () => {
    expect(isTabAppView("home")).toBe(true);
    expect(isTabAppView("orders")).toBe(false);
    const subPage: AppView = "settings";
    expect(isTabAppView(subPage)).toBe(false);
  });
});
