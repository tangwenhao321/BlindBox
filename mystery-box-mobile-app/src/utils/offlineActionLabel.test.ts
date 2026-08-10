import { describe, expect, it } from "vitest";
import { resolveOfflineActionLabel, resolveOfflineMutationLabel } from "./offlineActionLabel";

describe("resolveOfflineActionLabel", () => {
  it("translates known i18n keys", () => {
    expect(resolveOfflineActionLabel("offline.actionLike")).toBe("点赞");
  });

  it("returns legacy plain-text labels unchanged", () => {
    expect(resolveOfflineActionLabel("自定义操作")).toBe("自定义操作");
  });
});

describe("resolveOfflineMutationLabel", () => {
  it("maps legacy Chinese labels to kind-based i18n keys", () => {
    expect(resolveOfflineMutationLabel("communityLike", "点赞")).toBe("点赞");
  });

  it("uses stored i18n keys directly", () => {
    expect(resolveOfflineMutationLabel("communityComment", "offline.actionComment")).toBe("发表评论");
  });

  it("prefers kind key when stored label is unknown legacy text", () => {
    expect(resolveOfflineMutationLabel("marketplaceBuy", "购买")).toBe("购买");
  });
});
