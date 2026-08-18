import { describe, expect, it } from "vitest";
import { resolveThemeSoundBank } from "./sound";

describe("resolveThemeSoundBank", () => {
  it("maps default/classic to classic, not adventure", () => {
    expect(resolveThemeSoundBank("default")).toBe("classic");
    expect(resolveThemeSoundBank("classic")).toBe("classic");
    expect(resolveThemeSoundBank("adventure")).toBe("adventure");
  });

  it("maps equipped Doc2 aliases onto dedicated banks", () => {
    expect(resolveThemeSoundBank("cyberpunk")).toBe("cyberpunk");
    expect(resolveThemeSoundBank("neon")).toBe("cyberpunk");
    expect(resolveThemeSoundBank("asmr")).toBe("asmr");
    expect(resolveThemeSoundBank("cute")).toBe("asmr");
    expect(resolveThemeSoundBank("party")).toBe("party");
    expect(resolveThemeSoundBank("luxury")).toBe("party");
  });
});
