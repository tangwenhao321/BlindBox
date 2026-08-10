import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCommunityPost, fetchCommunityPosts } from "./communityService";

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock("../api", () => ({
  api: { get: getMock, post: postMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("communityService", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it("fetchCommunityPosts returns paginated items", async () => {
    getMock.mockResolvedValueOnce({
      data: { items: [{ id: "p1", content: "hello", comments: [], likes: [] }], hasMore: true },
    });
    const page = await fetchCommunityPosts("tok", 1, 10);
    expect(page.items).toHaveLength(1);
    expect(page.hasMore).toBe(true);
  });

  it("createCommunityPost posts content", async () => {
    postMock.mockResolvedValueOnce({
      data: { id: "p2", content: "#topic hi", comments: [], likes: [] },
    });
    const post = await createCommunityPost("tok", "#topic hi");
    expect(post.id).toBe("p2");
    expect(postMock).toHaveBeenCalledWith(
      "/front/community/posts",
      { content: "#topic hi" },
      { headers: { token: "tok" } },
    );
  });
});
