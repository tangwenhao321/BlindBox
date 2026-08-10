import { afterEach, describe, expect, it, vi } from "vitest";
import { buildInviteUrl } from "./inviteUrl";

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
});
