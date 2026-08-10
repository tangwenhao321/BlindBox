import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  enqueueOfflineMutation,
  flushOfflineMutationQueue,
  getOfflineMutationLabelsForTests,
  getOfflineQueueSnapshot,
  getPendingOfflineMutationCount,
  hydrateOfflineMutationQueue,
  resetOfflineMutationQueueForTests,
} from "./offlineMutationQueue";

vi.mock("./offlineMutationStorage", () => ({
  appendPersistedMutation: vi.fn(),
  loadPersistedMutations: vi.fn().mockResolvedValue([]),
  removePersistedMutation: vi.fn(),
}));

describe("offlineMutationQueue", () => {
  beforeEach(() => {
    resetOfflineMutationQueueForTests();
    vi.clearAllMocks();
  });

  it("queues and flushes mutations", async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    enqueueOfflineMutation("save", run);
    expect(getPendingOfflineMutationCount()).toBe(1);
    const result = await flushOfflineMutationQueue();
    expect(run).toHaveBeenCalled();
    expect(getPendingOfflineMutationCount()).toBe(0);
    expect(result).toEqual({ processed: 1, stoppedOnError: false });
  });

  it("stops flush on first error", async () => {
    const ok = vi.fn().mockResolvedValue(undefined);
    const fail = vi.fn().mockRejectedValue(new Error("fail"));
    enqueueOfflineMutation("ok", ok);
    enqueueOfflineMutation("fail", fail);
    const result = await flushOfflineMutationQueue();
    expect(result).toEqual({ processed: 1, stoppedOnError: true });
    expect(getPendingOfflineMutationCount()).toBe(1);
  });

  it("hydrates persisted mutations once", async () => {
    const { loadPersistedMutations } = await import("./offlineMutationStorage");
    vi.mocked(loadPersistedMutations).mockResolvedValueOnce([
      {
        id: "disk-1",
        label: "点赞",
        kind: "communityLike",
        token: "tok",
        payload: { postId: "p1" },
        createdAt: 1,
      },
    ]);
    const added = await hydrateOfflineMutationQueue();
    expect(added).toBe(1);
    expect(getPendingOfflineMutationCount()).toBe(1);
    expect(getOfflineMutationLabelsForTests()).toEqual(["offline.actionLike"]);
    expect(getOfflineQueueSnapshot().items[0]?.id).toBeTruthy();
    const addedAgain = await hydrateOfflineMutationQueue();
    expect(addedAgain).toBe(0);
  });

  it("keeps i18n action keys when hydrating", async () => {
    const { loadPersistedMutations } = await import("./offlineMutationStorage");
    vi.mocked(loadPersistedMutations).mockResolvedValueOnce([
      {
        id: "disk-2",
        label: "offline.actionComment",
        kind: "communityComment",
        token: "tok",
        payload: { postId: "p2", content: "hi" },
        createdAt: 2,
      },
    ]);
    await hydrateOfflineMutationQueue();
    expect(getOfflineMutationLabelsForTests()).toEqual(["offline.actionComment"]);
  });

  it("normalizes enqueue labels from persist kind", () => {
    const run = vi.fn().mockResolvedValue(undefined);
    enqueueOfflineMutation("点赞", run, { kind: "communityLike", token: "tok", payload: { postId: "p1" } });
    expect(getOfflineMutationLabelsForTests()).toEqual(["offline.actionLike"]);
  });
});
