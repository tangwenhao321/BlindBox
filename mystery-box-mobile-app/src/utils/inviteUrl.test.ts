import { afterEach, describe, expect, it, vi } from "vitest";
import { buildInviteSchemeUrl, buildInviteShareTextLinks, buildInviteUrl } from "./inviteUrl";

describe("buildInviteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses https base when configured", () => {
    vi.stubEnv("EXPO_PUBLIC_INVITE_BASE_URL", "https://h5.example.com");
    expect(buildInviteUrl("ABC12")).toBe("https://h5.example.com/invite/ABC12");
  });

  it("falls back to custom scheme", () => {
    vi.stubEnv("EXPO_PUBLIC_INVITE_BASE_URL", "");
    expect(buildInviteUrl("XYZ")).toBe("mysterybox://invite?invite=XYZ");
  });

  it("always builds scheme link with code", () => {
    expect(buildInviteSchemeUrl("CODE1")).toBe("mysterybox://invite?invite=CODE1");
  });

  it("share links include scheme even when https primary is set", () => {
    vi.stubEnv("EXPO_PUBLIC_INVITE_BASE_URL", "https://h5.example.com");
    const links = buildInviteShareTextLinks("ABC");
    expect(links.primary).toBe("https://h5.example.com/invite/ABC");
    expect(links.scheme).toBe("mysterybox://invite?invite=ABC");
  });
});
