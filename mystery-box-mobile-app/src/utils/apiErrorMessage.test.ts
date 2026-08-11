import { describe, expect, it } from "vitest";
import { ApiClientError } from "../api";
import i18n from "../i18n";
import { parseError, resolveApiErrorMessage, toAppError } from "./apiErrorMessage";

describe("resolveApiErrorMessage", () => {
  it("maps known API error codes to i18n strings", () => {
    expect(resolveApiErrorMessage(new ApiClientError("raw", 1001010))).toBe("登录已失效，请重新登录");
    expect(resolveApiErrorMessage(new ApiClientError("raw", 1001007))).toBe("未授权，请重新登录");
    expect(resolveApiErrorMessage(new ApiClientError("raw", 1001008))).toBe("登录凭证无效，请重新登录");
    expect(resolveApiErrorMessage(new ApiClientError("系统异常", 10007))).toBe("服务繁忙，请稍后重试");
  });

  it("falls back to server message for unknown codes", () => {
    expect(resolveApiErrorMessage(new ApiClientError("库存不足", 400001))).toBe("库存不足");
  });

  it("maps Chinese server messages to i18n when locale is en-US", async () => {
    const prev = i18n.language;
    await i18n.changeLanguage("en-US");
    expect(resolveApiErrorMessage(new ApiClientError("订单不存在", 400001))).toBe("Order not found");
    await i18n.changeLanguage(prev);
  });

  it("maps token error codes in every locale", async () => {
    const prev = i18n.language;
    await i18n.changeLanguage("zh-CN");
    expect(resolveApiErrorMessage(new ApiClientError("PITY_STOCK_EXHAUSTED:保底触发", 400001))).toContain("保底");
    expect(resolveApiErrorMessage(new ApiClientError("PITY_COMPENSATE_DENIED:x", 400001))).toContain("保底补偿");
    expect(resolveApiErrorMessage(new ApiClientError("TEAM_LOTTERY_UNPAID:pay", 400001))).toContain("支付");
    expect(resolveApiErrorMessage(new ApiClientError("MARKETPLACE_GATEWAY_NOT_READY: x", 400001))).toContain("打款");
    expect(
      resolveApiErrorMessage(new ApiClientError("raw", 400001, undefined, "REFUND_IN_PROGRESS")),
    ).toContain("退款");
    await i18n.changeLanguage("en-US");
    expect(resolveApiErrorMessage(new ApiClientError("TEAM_LOTTERY_LOCKED", 400001))).toContain("Team lottery");
    expect(resolveApiErrorMessage(new ApiClientError("MARKETPLACE_CREDIT_LOW: low", 400001))).toContain("Marketplace");
    expect(
      resolveApiErrorMessage(new ApiClientError("raw", 400001, undefined, "STOCK_CONFLICT")),
    ).toContain("Stock");
    await i18n.changeLanguage(prev);
  });
});

describe("parseError", () => {
  it("does not append traceId or parenthetical suffixes", () => {
    expect(parseError(new ApiClientError("失败（详情）", 400001, "trace-1"))).toBe("失败");
  });

  it("strips parenthetical content from generic errors", () => {
    expect(parseError(new Error("network down (timeout)"))).toBe("network down");
  });

  it("returns generic retry message for unknown values", () => {
    expect(parseError(null)).toBe("请求失败，请稍后重试");
  });
});

describe("toAppError", () => {
  it("wraps unknown values with parseError message", () => {
    expect(toAppError(null).message).toBe("请求失败，请稍后重试");
  });

  it("returns Error instances unchanged", () => {
    const err = new Error("boom");
    expect(toAppError(err)).toBe(err);
  });
});
