import { describe, expect, it } from "vitest";
import { isPublicAuthApiPath } from "./apiAuth";

describe("isPublicAuthApiPath", () => {
  it("matches login and register endpoints", () => {
    expect(isPublicAuthApiPath("/front/user/login")).toBe(true);
    expect(isPublicAuthApiPath("/front/user/register")).toBe(true);
    expect(isPublicAuthApiPath("/front/user/password")).toBe(true);
  });

  it("does not match authenticated APIs", () => {
    expect(isPublicAuthApiPath("/front/user/info")).toBe(false);
    expect(isPublicAuthApiPath("/front/mystery-box/query")).toBe(false);
  });
});
