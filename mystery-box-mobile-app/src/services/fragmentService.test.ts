import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchFragmentBalance, fetchFragmentProgress } from "./fragmentService";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("../api", () => ({
  api: { get: getMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("fragmentService", () => {
  beforeEach(() => getMock.mockReset());

  it("fetchFragmentBalance returns balance", async () => {
    getMock.mockResolvedValueOnce({ data: { result: { balance: 42 } } });
    await expect(fetchFragmentBalance("tok")).resolves.toBe(42);
  });

  it("fetchFragmentProgress returns null on error", async () => {
    getMock.mockRejectedValueOnce(new Error("fail"));
    await expect(fetchFragmentProgress("tok")).resolves.toBeNull();
  });
});
