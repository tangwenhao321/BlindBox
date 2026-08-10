import { describe, expect, it } from "vitest";
import { formatWaitDuration } from "./formatWaitDuration";
import { isCouponExpiringSoon } from "./couponExpiry";
import { buildOrderCommunityDraft } from "./orderShareDraft";

describe("formatWaitDuration", () => {
  it("formats sub-minute waits", () => {
    expect(formatWaitDuration(45)).toBe("~45s");
  });

  it("formats minute waits", () => {
    expect(formatWaitDuration(120)).toBe("~2 min");
  });
});

describe("couponExpiry", () => {
  it("flags coupons expiring within 7 days", () => {
    const soon = new Date(Date.now() + 3 * 86400000).toISOString();
    expect(isCouponExpiringSoon({ expirationDate: soon })).toBe(true);
  });
});

describe("orderShareDraft", () => {
  it("builds community draft from order", () => {
    const t = ((key: string, opts?: Record<string, unknown>) => {
      if (key === "sharePoster.communityDraftPrize") return ` — got «${opts?.name}»!`;
      return `Show-off | ${opts?.boxName} x${opts?.count}${opts?.prize ?? ""}`;
    }) as import("i18next").TFunction;
    const draft = buildOrderCommunityDraft(
      t,
      {
        id: "o1",
        status: "DONE",
        items: [{ mysteryBoxCount: 2, mysteryBox: { name: "Demo Box" } }],
      },
      "Legend Prize",
    );
    expect(draft).toContain("Demo Box");
    expect(draft).toContain("Legend Prize");
  });
});
