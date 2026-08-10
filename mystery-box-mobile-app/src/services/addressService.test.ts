import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryAddresses, saveAddressForUser } from "./addressService";

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

vi.mock("../api", () => {
  return {
    api: {
      post: postMock,
    },
    buildAuthHeaders: (token: string) => ({ token }),
  };
});

describe("addressService", () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it("queries addresses", async () => {
    postMock.mockResolvedValueOnce({
      data: {
        code: 1,
        msg: "ok",
        result: { content: [{ id: "addr-1", realName: "张三", phoneNumber: "138", details: "深圳", houseNumber: "1栋", top: true }] },
      },
    });

    const list = await queryAddresses("token-1");
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("addr-1");
  });

  it("saves address and returns id", async () => {
    postMock.mockResolvedValueOnce({
      data: { code: 1, msg: "ok", result: "addr-1" },
    });

    const id = await saveAddressForUser("token-1", {
      realName: "张三",
      phoneNumber: "13800000000",
      details: "深圳市南山区",
      houseNumber: "1栋101",
      top: true,
    });
    expect(id).toBe("addr-1");
    expect(postMock).toHaveBeenCalledWith(
      "/front/address/save",
      expect.objectContaining({
        realName: "张三",
        top: true,
      }),
      { headers: { token: "token-1" } },
    );
  });

  it("defaults top when omitted", async () => {
    postMock.mockResolvedValueOnce({
      data: { code: 1, msg: "ok", result: "addr-2" },
    });

    await saveAddressForUser("token-1", {
      realName: "李四",
      phoneNumber: "13800000001",
      details: "广州市天河区",
      houseNumber: "2栋202",
    });
    expect(postMock).toHaveBeenCalledWith(
      "/front/address/save",
      expect.objectContaining({ top: false }),
      { headers: { token: "token-1" } },
    );
  });
});

