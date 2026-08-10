import { describe, expect, it } from "vitest";
import { resolveRevealPacing, sortRevealSequence } from "./revealSequence";

describe("revealSequence", () => {
  it("puts highest rarity last for finale", () => {
    const seq = sortRevealSequence([
      { id: "1", name: "A", price: 400, qualityType: "LEGENDARY" },
      { id: "2", name: "B", price: 1, qualityType: "GENERAL" },
      { id: "3", name: "C", price: 1, qualityType: "GENERAL" },
    ]);
    expect(seq[seq.length - 1].id).toBe("1");
  });

  it("resolves pacing by index and ceremony", () => {
    expect(resolveRevealPacing(0, 5)).toBe("normal");
    expect(resolveRevealPacing(1, 5)).toBe("fast");
    expect(resolveRevealPacing(2, 5)).toBe("normal");
    expect(resolveRevealPacing(3, 5)).toBe("normal");
    expect(resolveRevealPacing(4, 5)).toBe("finale");
    expect(resolveRevealPacing(0, 10)).toBe("normal");
    expect(resolveRevealPacing(9, 10)).toBe("finale");
    expect(resolveRevealPacing(0, 1, "PEERLESS")).toBe("ceremony");
  });
});
