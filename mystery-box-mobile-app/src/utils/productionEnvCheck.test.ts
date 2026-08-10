import { describe, expect, it } from "vitest";
import { getProductionEnvWarnings } from "./productionEnvCheck";

describe("productionEnvCheck", () => {
  it("returns no warnings in dev", () => {
    expect(getProductionEnvWarnings()).toEqual([]);
  });
});
