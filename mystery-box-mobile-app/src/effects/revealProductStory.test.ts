import { describe, expect, it } from "vitest";
import { resolveProductStory } from "./revealProductStory";

describe("resolveProductStory", () => {
  it("fills the prize name into locale copy", () => {
    const story = resolveProductStory("p1", "Lan");
    expect(story.productId).toBe("p1");
    expect(story.title).toContain("Lan");
    expect(story.body).toContain("Lan");
    expect(story.tagline).toContain("Lan");
  });
});
