import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApiClientError } from "../api";

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
    },
  };
});

import { api } from "../api";
import { fetchSpectatorReveal, resolveSpectatorShareToken } from "./spectatorService";

describe("spectatorService", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.patch).mockReset();
  });

  it("fetchSpectatorReveal maps ok payload", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        result: {
          orderId: "order-1",
          phase: "playing",
          snapshot: { total: 2, revealIndex: 0 },
        },
      },
    });

    await expect(fetchSpectatorReveal("tok-1")).resolves.toEqual({
      status: "ok",
      orderId: "order-1",
      phase: "playing",
      snapshot: { total: 2, revealIndex: 0 },
    });
  });

  it("fetchSpectatorReveal maps expired business error", async () => {
    vi.mocked(api.get).mockRejectedValue(new ApiClientError("REVEAL_SPECTATOR_EXPIRED", 10007));

    await expect(fetchSpectatorReveal("tok-expired")).resolves.toEqual({ status: "expired" });
  });

  it("resolveSpectatorShareToken reuses active token", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { result: { token: "active-tok" } } });
    vi.mocked(api.patch).mockResolvedValue({ data: { code: 1 } });

    await expect(
      resolveSpectatorShareToken("auth", "order-1", null, {
        phase: "summary",
        snapshot: { total: 1 },
      }),
    ).resolves.toBe("active-tok");

    expect(api.patch).toHaveBeenCalledWith(
      "/front/reveal/spectator/active-tok",
      { phase: "summary", snapshot: { total: 1 } },
      expect.objectContaining({ headers: { Authorization: "auth" } }),
    );
  });
});
