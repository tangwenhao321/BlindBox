import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBoxById, queryBoxes } from "./boxService";

const { postMock, getMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  getMock: vi.fn(),
}));

vi.mock("../api", () => {
  return {
    api: {
      post: postMock,
      get: getMock,
    },
    buildAuthHeaders: (token: string) => ({ token }),
  };
});

describe("boxService", () => {
  beforeEach(() => {
    postMock.mockReset();
    getMock.mockReset();
  });

  it("queries boxes for front list", async () => {
    postMock.mockResolvedValueOnce({
      data: {
        code: 1,
        msg: "ok",
        result: { content: [{ id: "box-1", name: "测试盲盒", price: 99, products: [] }] },
      },
    });

    const { items, hasMore } = await queryBoxes("token-1");
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("box-1");
    expect(hasMore).toBe(false);
  });

  it("gets box details by id", async () => {
    getMock.mockResolvedValueOnce({
      data: { code: 1, msg: "ok", result: { id: "box-1", name: "测试盲盒", price: 99, products: [] } },
    });

    const box = await getBoxById("token-1", "box-1");
    expect(box.id).toBe("box-1");
    expect(getMock).toHaveBeenCalledWith("/front/mystery-box/box-1", {
      headers: { token: "token-1" },
    });
  });
});

