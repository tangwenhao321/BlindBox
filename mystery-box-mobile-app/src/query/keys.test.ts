import { describe, expect, it } from "vitest";
import { queryKeys } from "./keys";

describe("queryKeys", () => {
  it("builds stable home catalog key", () => {
    expect(queryKeys.boxes.home("tok-1")).toEqual(["boxes", "home", "tok-1"]);
  });

  it("builds mall key with category and keyword", () => {
    expect(queryKeys.boxes.mall("tok-1", "cat-a", "kw")).toEqual([
      "boxes",
      "mall",
      "tok-1",
      "cat-a",
      "kw",
    ]);
  });

  it("builds orders list key", () => {
    expect(queryKeys.orders.list("tok-1")).toEqual(["orders", "list", "tok-1"]);
  });

  it("builds favorites and coupons keys", () => {
    expect(queryKeys.favorites.ids("tok-1")).toEqual(["favorites", "ids", "tok-1"]);
    expect(queryKeys.coupons.list("tok-1")).toEqual(["coupons", "list", "tok-1"]);
  });

  it("builds notifications list key", () => {
    expect(queryKeys.notifications.list("tok-1", 20)).toEqual(["notifications", "list", "tok-1", 20]);
  });

  it("builds home catalog side keys", () => {
    expect(queryKeys.home.summary("tok")).toEqual(["home", "summary", "tok"]);
    expect(queryKeys.home.recommend("tok-1")).toEqual(["home", "recommend", "tok-1"]);
    expect(queryKeys.home.drawFeed("tok-1")).toEqual(["home", "drawFeed", "tok-1"]);
    expect(queryKeys.search.hotKeywords()).toEqual(["search", "hotKeywords"]);
  });
});
