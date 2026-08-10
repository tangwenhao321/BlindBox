import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchQueueStatus, joinDrawQueue } from "./drawQueueService";

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock("../api", () => ({
  api: { get: getMock, post: postMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("drawQueueService", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it("joinDrawQueue unwraps queue status", async () => {
    postMock.mockResolvedValueOnce({
      data: { result: { position: 2, total: 5, canDraw: false } },
    });
    const status = await joinDrawQueue("tok", "box-1");
    expect(status.position).toBe(2);
    expect(postMock).toHaveBeenCalledWith(
      "/front/mystery-box/box-1/draw-queue/join",
      {},
      { headers: { token: "tok" } },
    );
  });

  it("fetchQueueStatus returns direct payload", async () => {
    getMock.mockResolvedValueOnce({
      data: { position: 1, total: 3, canDraw: true, lockHeldByMe: true },
    });
    const status = await fetchQueueStatus("tok", "box-2");
    expect(status.canDraw).toBe(true);
    expect(status.lockHeldByMe).toBe(true);
  });
});
