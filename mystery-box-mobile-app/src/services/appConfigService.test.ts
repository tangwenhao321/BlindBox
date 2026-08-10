import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAppPublicConfig } from "./appConfigService";

vi.mock("../api", () => ({
  api: {
    get: vi.fn(),
  },
}));

describe("fetchAppPublicConfig", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("maps support fields from API", async () => {
    const { api } = await import("../api");
    vi.mocked(api.get).mockResolvedValue({
      data: { result: { supportHotline: "400-123", enterpriseWechat: "wx-id" } },
    });
    const config = await fetchAppPublicConfig();
    expect(config.supportHotline).toBe("400-123");
    expect(config.enterpriseWechat).toBe("wx-id");
  });

  it("returns empty strings when fields missing", async () => {
    const { api } = await import("../api");
    vi.mocked(api.get).mockResolvedValue({ data: { result: {} } });
    const config = await fetchAppPublicConfig();
    expect(config.supportHotline).toBe("");
    expect(config.enterpriseWechat).toBe("");
  });

  it("passes boxId and categoryId query params", async () => {
    const { api } = await import("../api");
    vi.mocked(api.get).mockResolvedValue({ data: { result: {} } });
    await fetchAppPublicConfig({ boxId: "box-1", categoryId: "cat-2" });
    expect(api.get).toHaveBeenCalledWith("/front/app/config", {
      params: { boxId: "box-1", categoryId: "cat-2", themeId: undefined },
    });
  });
});
