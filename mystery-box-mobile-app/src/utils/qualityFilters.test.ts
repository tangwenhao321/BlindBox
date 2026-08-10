import { describe, expect, it } from "vitest";
import { filterItemsByQuality } from "./qualityFilters";

describe("filterItemsByQuality", () => {
  const items = [
    { id: "1", qualityType: "GENERAL" },
    { id: "2", qualityType: "HIDDEN" },
    { id: "3", qualityType: "LEGENDARY" },
    { id: "4", qualityType: "ADVANCED" },
  ];

  it("returns all items for ALL filter", () => {
    expect(filterItemsByQuality(items, "ALL")).toHaveLength(4);
  });

  it("filters by normalized tier", () => {
    expect(filterItemsByQuality(items, "HIDDEN")).toEqual([items[1]]);
    expect(filterItemsByQuality(items, "LEGENDARY")).toEqual([items[2]]);
    expect(filterItemsByQuality(items, "ADVANCED")).toEqual([items[3]]);
    expect(filterItemsByQuality(items, "GENERAL")).toEqual([items[0]]);
  });
});
