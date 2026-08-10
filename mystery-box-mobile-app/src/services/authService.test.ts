import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginByPhone, queryUserBalanceLogs, registerByPhone } from "./authService";

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

describe("authService", () => {
  beforeEach(() => {
    postMock.mockReset();
    getMock.mockReset();
  });

  it("logs in by phone and returns token", async () => {
    postMock.mockResolvedValueOnce({
      data: { code: 1, msg: "ok", result: { tokenValue: "token-login" } },
    });

    const token = await loginByPhone("13800000000", "12345678");
    expect(token).toBe("token-login");
    expect(postMock).toHaveBeenCalledWith("/front/user/login", {
      phone: "13800000000",
      password: "12345678",
    });
  });

  it("registers by phone and returns token", async () => {
    postMock.mockResolvedValueOnce({
      data: { code: 1, msg: "ok", result: { tokenValue: "token-register" } },
    });

    const token = await registerByPhone("13800000000", "12345678", "000000");
    expect(token).toBe("token-register");
    expect(postMock).toHaveBeenCalledWith("/front/user/register", {
      phone: "13800000000",
      password: "12345678",
      code: "000000",
      inviteCode: "",
    });
  });

  it("queries user balance logs", async () => {
    getMock.mockResolvedValueOnce({
      data: { code: 1, msg: "ok", result: [{ id: "log-1", amount: 10 }] },
    });
    const result = await queryUserBalanceLogs("token-1", 50);
    expect(result).toHaveLength(1);
    expect(getMock).toHaveBeenCalledWith("/front/user/balance/logs", {
      params: { limit: 50 },
      headers: { token: "token-1" },
    });
  });
});

