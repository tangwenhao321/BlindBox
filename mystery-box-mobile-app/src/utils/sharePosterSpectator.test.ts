import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("expo-linking", () => ({
  createURL: (path: string) => `mysterybox://${path}`,
}));

vi.mock("../services/spectatorService", () => ({
  resolveSpectatorShareToken: vi.fn(),
}));

vi.mock("../navigation/appViewRoutes", () => ({
  appViewToHref: (_view: string, params: { spectatorToken: string }) =>
    `reveal/spectator?spectatorToken=${params.spectatorToken}`,
}));

import { resolveSpectatorShareToken } from "../services/spectatorService";
import { resolveSpectatorPosterLink } from "./sharePosterSpectator";

describe("sharePosterSpectator", () => {
  beforeEach(() => {
    vi.mocked(resolveSpectatorShareToken).mockReset();
  });

  it("builds deep link when token resolves", async () => {
    vi.mocked(resolveSpectatorShareToken).mockResolvedValue("tok-abc");

    await expect(
      resolveSpectatorPosterLink({
        authToken: "auth",
        orderId: "order-1",
        drawCount: 3,
        topPrizeName: "Legend",
        spectatorShareToken: "tok-abc",
      }),
    ).resolves.toBe("mysterybox://reveal/spectator?spectatorToken=tok-abc");

    expect(resolveSpectatorShareToken).toHaveBeenCalledWith(
      "auth",
      "order-1",
      "tok-abc",
      expect.objectContaining({ phase: "summary" }),
    );
  });

  it("returns null when token cannot be resolved", async () => {
    vi.mocked(resolveSpectatorShareToken).mockResolvedValue(null);
    await expect(
      resolveSpectatorPosterLink({
        authToken: "auth",
        orderId: "order-1",
        drawCount: 1,
      }),
    ).resolves.toBeNull();
  });
});
