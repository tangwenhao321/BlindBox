import { describe, expect, it } from "vitest";
import { collectLocaleKeyPaths, getLocaleValueByPath, mergeLocaleModules } from "./mergeLocale";

describe("mergeLocaleModules", () => {
  it("deep-merges nested namespace objects", () => {
    const merged = mergeLocaleModules(
      { home: { title: "Home", search: "Search" } },
      { home: { search: "Find", banner: "Hot" }, profile: { title: "Me" } },
    );
    expect(merged).toEqual({
      home: { title: "Home", search: "Find", banner: "Hot" },
      profile: { title: "Me" },
    });
  });

  it("replaces scalar values from later modules", () => {
    expect(mergeLocaleModules({ a: 1 }, { a: 2 })).toEqual({ a: 2 });
  });
});

describe("collectLocaleKeyPaths", () => {
  it("collects sorted leaf paths", () => {
    const keys = collectLocaleKeyPaths({
      home: { title: "x", search: "y" },
      common: { ok: "z" },
    });
    expect(keys).toEqual(["common.ok", "home.search", "home.title"]);
  });
});

describe("getLocaleValueByPath", () => {
  it("reads nested values", () => {
    const tree = { home: { title: "Home" } };
    expect(getLocaleValueByPath(tree, "home.title")).toBe("Home");
    expect(getLocaleValueByPath(tree, "missing")).toBeUndefined();
  });
});
