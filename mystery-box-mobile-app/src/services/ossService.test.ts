import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadImageFile } from "./ossService";

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));

vi.mock("../api", () => ({
  api: { post: postMock },
  buildAuthHeaders: (token: string) => ({ token }),
  parseError: (error: unknown) => String(error),
}));

describe("ossService", () => {
  beforeEach(() => postMock.mockReset());

  it("uploadImageFile returns url from result", async () => {
    postMock.mockResolvedValueOnce({ data: { result: "https://cdn.example.com/a.jpg" } });
    const url = await uploadImageFile("tok", "file:///local/a.jpg", "a.jpg");
    expect(url).toBe("https://cdn.example.com/a.jpg");
  });

  it("uploadImageFile throws when result missing", async () => {
    postMock.mockResolvedValueOnce({ data: { result: "" } });
    await expect(uploadImageFile("tok", "file:///local/a.png")).rejects.toThrow(/未返回/);
  });
});
