import { afterEach, describe, expect, it } from "vitest";
import { clearRecommendAttribution, setVariant, takeVariant } from "./lastRecommendAttribution";

describe("lastRecommendAttribution", () => {
  afterEach(() => {
    clearRecommendAttribution();
  });

  it("stores and takes variant once per box", () => {
    setVariant("box-1", "PERSONALIZED");
    expect(takeVariant("box-1")).toBe("PERSONALIZED");
    expect(takeVariant("box-1")).toBeUndefined();
  });

  it("ignores blank variant", () => {
    setVariant("box-1", "  ");
    expect(takeVariant("box-1")).toBeUndefined();
  });

  it("keeps variants per box id", () => {
    setVariant("a", "POPULAR");
    setVariant("b", "PERSONALIZED");
    expect(takeVariant("b")).toBe("PERSONALIZED");
    expect(takeVariant("a")).toBe("POPULAR");
  });
});
