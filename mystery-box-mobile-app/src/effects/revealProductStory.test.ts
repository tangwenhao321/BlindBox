import { describe, expect, it } from "vitest";
import { resolveProductStory } from "./revealProductStory";

describe("resolveProductStory", () => {
  it("fills the prize name into locale copy", () => {
    const story = resolveProductStory("p1", "Lan");
    expect(story.productId).toBe("p1");
    expect(story.title).toContain("Lan");
    expect(story.body).toContain("Lan");
    expect(story.tagline).toContain("Lan");
    expect(story.fromCatalog).toBe(false);
  });

  it("prefers SKU attributes over locale templates", () => {
    const story = resolveProductStory("p1", "Lan", {
      id: "p1",
      name: "Lan",
      description: "Generic fallback",
      attributes: [
        { name: "storyTitle", values: ["Kho báu · Lan"] },
        { name: "storyBody", values: ["Tín vật sơn mài."] },
        { name: "storyTagline", values: ["Lan hiện hình"] },
      ],
    });
    expect(story.title).toBe("Kho báu · Lan");
    expect(story.body).toBe("Tín vật sơn mài.");
    expect(story.tagline).toBe("Lan hiện hình");
    expect(story.fromCatalog).toBe(true);
  });

  it("uses description when storyBody is missing", () => {
    const story = resolveProductStory("p1", "Lan", {
      description: "Một tín vật từ Huế.",
    });
    expect(story.body).toBe("Một tín vật từ Huế.");
    expect(story.fromCatalog).toBe(true);
  });
});
