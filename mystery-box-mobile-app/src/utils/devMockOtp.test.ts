import { afterEach, describe, expect, it } from "vitest";
import { getDevMockOtp, resolveSmsCode } from "./devMockOtp";

describe("devMockOtp", () => {
  const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;
  const originalEnv = process.env.EXPO_PUBLIC_DEV_MOCK_OTP;

  afterEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
    if (originalEnv === undefined) {
      delete process.env.EXPO_PUBLIC_DEV_MOCK_OTP;
    } else {
      process.env.EXPO_PUBLIC_DEV_MOCK_OTP = originalEnv;
    }
  });

  it("returns mock OTP only in dev when env is set", () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    process.env.EXPO_PUBLIC_DEV_MOCK_OTP = "123456";
    expect(getDevMockOtp()).toBe("123456");
  });

  it("resolveSmsCode prefers user input", () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    expect(resolveSmsCode("654321")).toBe("654321");
  });

  it("resolveSmsCode falls back to dev mock", () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    process.env.EXPO_PUBLIC_DEV_MOCK_OTP = "111222";
    expect(resolveSmsCode(undefined)).toBe("111222");
  });

  it("resolveSmsCode throws when code missing outside dev mock", () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    delete process.env.EXPO_PUBLIC_DEV_MOCK_OTP;
    expect(() => resolveSmsCode("")).toThrow();
  });
});
