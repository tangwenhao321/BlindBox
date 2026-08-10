import { describe, expect, it } from "vitest";
import { parseInviteCodeFromUrl } from "./inviteDeepLink";

describe("parseInviteCodeFromUrl", () => {
  it("reads invite query param", () => {
    expect(parseInviteCodeFromUrl("mysterybox://register?invite=ABC123")).toBe("ABC123");
  });

  it("reads code alias and path segment", () => {
    expect(parseInviteCodeFromUrl("https://app.example.com/invite/XYZ9")).toBe("XYZ9");
    expect(parseInviteCodeFromUrl("mysterybox://invite/XYZ9")).toBe("XYZ9");
  });

  it("returns null for unrelated urls", () => {
    expect(parseInviteCodeFromUrl("https://example.com/home")).toBeNull();
  });
});
