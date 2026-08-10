import { describe, expect, it } from "vitest";
import { appendImageUrlsToContent, splitCommunityContent } from "./communityContent";

describe("splitCommunityContent", () => {
  it("separates text and image URLs", () => {
    const content = "#晒单 开出了隐藏款\nhttps://cdn.example.com/a.jpg\nhttps://cdn.example.com/b.png";
    const { text, images } = splitCommunityContent(content);
    expect(text).toBe("#晒单 开出了隐藏款");
    expect(images).toEqual(["https://cdn.example.com/a.jpg", "https://cdn.example.com/b.png"]);
  });

  it("returns empty images when content has no URLs", () => {
    const { text, images } = splitCommunityContent("#晒单 纯文字");
    expect(text).toBe("#晒单 纯文字");
    expect(images).toEqual([]);
  });

  it("ignores non-image lines", () => {
    const { text, images } = splitCommunityContent("hello\nnot-a-url\nhttps://x.com/pic.webp");
    expect(text).toBe("hello\nnot-a-url");
    expect(images).toEqual(["https://x.com/pic.webp"]);
  });
});

describe("appendImageUrlsToContent", () => {
  it("appends image URLs on new lines", () => {
    const result = appendImageUrlsToContent("#晒单 战报", ["https://cdn.example.com/a.jpg"]);
    expect(result).toBe("#晒单 战报\nhttps://cdn.example.com/a.jpg");
  });

  it("returns only URLs when text is empty", () => {
    const result = appendImageUrlsToContent("", ["https://cdn.example.com/a.jpg", "https://cdn.example.com/b.png"]);
    expect(result).toBe("https://cdn.example.com/a.jpg\nhttps://cdn.example.com/b.png");
  });

  it("returns content unchanged when no URLs", () => {
    expect(appendImageUrlsToContent("hello", [])).toBe("hello");
  });
});
