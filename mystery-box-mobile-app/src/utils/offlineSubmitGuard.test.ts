import { beforeEach, describe, expect, it, vi } from "vitest";
import { enqueueOfflineMutation } from "../offline/offlineMutationQueue";
import { setOffline } from "./connectivity";
import { blockOfflineSubmit, queueIfOffline } from "./offlineSubmitGuard";
import { toast } from "./toast";

vi.mock("./toast", () => ({
  toast: { info: vi.fn() },
}));

vi.mock("../offline/offlineMutationQueue", () => ({
  enqueueOfflineMutation: vi.fn(() => "queued-id"),
}));

describe("blockOfflineSubmit", () => {
  beforeEach(() => {
    setOffline(false);
    vi.clearAllMocks();
  });

  it("allows submit when online", () => {
    expect(blockOfflineSubmit("offline.actionOrder")).toBe(false);
    expect(toast.info).not.toHaveBeenCalled();
  });

  it("blocks submit when offline", () => {
    setOffline(true);
    expect(blockOfflineSubmit("offline.actionPay")).toBe(true);
    expect(toast.info).toHaveBeenCalledWith("当前离线，请恢复网络后再支付");
  });
});

describe("queueIfOffline", () => {
  beforeEach(() => {
    setOffline(false);
    vi.clearAllMocks();
  });

  it("returns false and does not enqueue when online", () => {
    const run = vi.fn(async () => undefined);
    expect(queueIfOffline("offline.actionSaveAddress", run)).toBe(false);
    expect(enqueueOfflineMutation).not.toHaveBeenCalled();
  });

  it("enqueues mutation when offline", () => {
    setOffline(true);
    const run = vi.fn(async () => undefined);
    expect(queueIfOffline("offline.actionComment", run)).toBe(true);
    expect(enqueueOfflineMutation).toHaveBeenCalledWith("offline.actionComment", run, undefined);
    expect(toast.info).toHaveBeenCalledWith("当前离线，发表评论已保存，恢复网络后自动完成");
  });
});
