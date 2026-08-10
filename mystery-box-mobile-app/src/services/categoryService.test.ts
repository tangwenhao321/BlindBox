import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryBoxCategories } from "./categoryService";

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

vi.mock("../api", () => ({
  api: { post: postMock, get: vi.fn() },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("categoryService", () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it("queries mystery box categories", async () => {
    postMock.mockResolvedValueOnce({
      data: {
        code: 1,
        msg: "ok",
        result: { content: [{ id: "c1", name: "潮玩", sortOrder: 1 }] },
      },
    });
    const items = await queryBoxCategories("token-1");
    expect(items[0].name).toBe("潮玩");
  });
});
