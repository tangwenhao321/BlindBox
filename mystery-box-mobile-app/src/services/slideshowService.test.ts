import { beforeEach, describe, expect, it, vi } from "vitest";
import { querySlideshows } from "./slideshowService";

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));

vi.mock("../api", () => ({
  api: { post: postMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("slideshowService", () => {
  beforeEach(() => postMock.mockReset());

  it("querySlideshows filters invalid and sorts", async () => {
    postMock.mockResolvedValueOnce({
      data: {
        result: {
          content: [
            { id: "s2", picture: "b.jpg", sort: 2, valid: true },
            { id: "s1", picture: "a.jpg", sort: 1, valid: true },
            { id: "s3", valid: false },
          ],
        },
      },
    });
    const items = await querySlideshows("tok", 5);
    expect(items.map((i) => i.id)).toEqual(["s1", "s2"]);
  });
});
