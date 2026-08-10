import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryUserCoupons } from "./couponService";

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));

vi.mock("../api", () => ({
  api: { post: postMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("couponService", () => {
  beforeEach(() => postMock.mockReset());

  it("returns coupon list from query result", async () => {
    postMock.mockResolvedValueOnce({
      data: { result: { content: [{ id: "c1", name: "满减券" }] } },
    });
    const rows = await queryUserCoupons("tok");
    expect(rows[0]?.id).toBe("c1");
  });
});
