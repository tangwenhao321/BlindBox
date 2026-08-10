import { beforeEach, describe, expect, it, vi } from "vitest";

const linking = vi.hoisted(() => ({
  canOpenURL: vi.fn(async () => true),
  openURL: vi.fn(async () => undefined),
}));

vi.mock("react-native", () => ({
  Linking: linking,
  Share: { share: vi.fn() },
}));

vi.mock("../i18n", () => ({
  default: { t: (key: string, opts?: { id?: string }) => (opts?.id ? `${key}:${opts.id}` : key) },
}));

vi.mock("./toast", () => ({
  toast: { info: vi.fn() },
}));

import { toast } from "./toast";
import { openZaloSupport } from "./contactSupport";

describe("openZaloSupport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    linking.canOpenURL.mockResolvedValue(true);
    linking.openURL.mockResolvedValue(undefined);
  });

  it("opens zalo.me URL for configured OA id", async () => {
    await openZaloSupport("my-oa-id");
    expect(linking.canOpenURL).toHaveBeenCalledWith("https://zalo.me/omy-oa-id");
    expect(linking.openURL).toHaveBeenCalledWith("https://zalo.me/omy-oa-id");
  });

  it("shows toast when OA id is missing", async () => {
    await openZaloSupport("");
    expect(linking.openURL).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith("contact.noZalo");
  });

  it("shows hint when URL cannot be opened", async () => {
    linking.canOpenURL.mockResolvedValue(false);
    await openZaloSupport("123456");
    expect(toast.info).toHaveBeenCalledWith("contact.zaloHint:123456");
  });
});
