import { describe, expect, it } from "vitest";
import {
  resolveSkipTapAction,
  acceleratePlaybackRate,
  accelerateDurationScale,
} from "../effects/revealSkipPolicy";
import { estimateMarketplaceNetProceeds } from "./marketplaceProceeds";

/**
 * Maps high-value JOURNEY / DRAW-MP scenario IDs to executable assertions.
 * Full UI E2E still runs via Maestro; this suite proves automatable slices.
 */
describe("journey scenario automation mapping", () => {
  it("JN slice: 终极首击暂停 / 再击跳过", () => {
    expect(resolveSkipTapAction("guarded", false, false, 1).action).toBe("pause");
    expect(resolveSkipTapAction("guarded", true, false, 1).action).toBe("skip");
  });

  it("JN slice: 单击1.5x / 长按2.5x", () => {
    expect(acceleratePlaybackRate(1)).toBe(1.5);
    expect(accelerateDurationScale(1)).toBe(0.67);
    expect(acceleratePlaybackRate(2)).toBe(2.5);
    expect(accelerateDurationScale(2)).toBe(0.4);
  });

  it("JN / MP: 手续费5% 预估与打款净额", () => {
    expect(estimateMarketplaceNetProceeds(100)).toBe(95);
  });

  it("DM-E2E: 十连跳过仍保持逻辑倍率可用（动画层策略）", () => {
    // skip always available on normal guard — prize count integrity is server-side IT
    expect(resolveSkipTapAction("normal", false, false, 1).action).toBe("skip");
  });
});
