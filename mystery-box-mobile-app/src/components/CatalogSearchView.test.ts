import { describe, expect, it } from "vitest";
import { buildCatalogHotKeywords, HOT_KEY_I18N } from "./catalogSearchHelpers";

describe("CatalogSearchView helpers", () => {
  it("builds four hot keywords from i18n keys when API empty", () => {
    const keywords = buildCatalogHotKeywords((key) => key);
    expect(keywords).toEqual([...HOT_KEY_I18N]);
  });

  it("prefers API hot keywords when provided", () => {
    const keywords = buildCatalogHotKeywords((key) => key, ["一番赏", "手办"]);
    expect(keywords).toEqual(["一番赏", "手办"]);
  });
});
