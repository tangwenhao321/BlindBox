import { describe, expect, it } from "vitest";
import { API_ERROR_CODE_KEYS, AUTH_ERROR_CODES } from "./apiErrorCodes";

describe("apiErrorCodes", () => {
  it("maps every auth error code to an i18n key", () => {
    for (const code of AUTH_ERROR_CODES) {
      expect(API_ERROR_CODE_KEYS[code], `missing i18n mapping for ${code}`).toBeTruthy();
    }
  });
});
