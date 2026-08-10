import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryMyFeedback, submitFeedback } from "./feedbackService";

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));

vi.mock("../api", () => ({
  api: { post: postMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("feedbackService", () => {
  beforeEach(() => postMock.mockReset());

  it("queryMyFeedback returns content list", async () => {
    postMock.mockResolvedValueOnce({
      data: { result: { content: [{ id: "f1", content: "很好", createdTime: "2026-01-01" }] } },
    });
    const list = await queryMyFeedback("tok");
    expect(list).toHaveLength(1);
  });

  it("submitFeedback posts content", async () => {
    postMock.mockResolvedValueOnce({ data: { result: "f-new" } });
    const id = await submitFeedback("tok", "建议增加筛选", ["https://img/a.jpg"]);
    expect(id).toBe("f-new");
    expect(postMock).toHaveBeenCalledWith(
      "/front/feedback/save",
      { content: "建议增加筛选", pictures: ["https://img/a.jpg"] },
      expect.any(Object),
    );
  });
});
