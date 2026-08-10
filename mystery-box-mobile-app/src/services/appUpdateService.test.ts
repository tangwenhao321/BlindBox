import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAppUpdateInfo } from "./appUpdateService";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("../api", () => ({
  api: { get: getMock },
}));

vi.mock("../utils/appVersion", () => ({
  getAppReleaseChannel: () => "production",
  getLocalAppVersion: () => ({ versionCode: 5, versionName: "1.0.5", channel: "production" }),
}));

describe("fetchAppUpdateInfo", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("maps a published release into update info", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        result: {
          hasUpdate: true,
          forceUpdate: false,
          versionCode: 9,
          versionName: "1.1.0",
          downloadUrl: " https://cdn.example.com/app.apk ",
          releaseNotes: "Fixes",
          minSupportedVersionCode: 0,
        },
      },
    });

    const info = await fetchAppUpdateInfo(5);

    expect(info.hasUpdate).toBe(true);
    expect(info.versionCode).toBe(9);
    expect(info.downloadUrl).toBe("https://cdn.example.com/app.apk");
    expect(info.forceUpdate).toBe(false);
  });

  it("forces the update when the local build is below the supported floor", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        result: {
          hasUpdate: true,
          forceUpdate: false,
          versionCode: 9,
          versionName: "1.1.0",
          downloadUrl: "https://cdn.example.com/app.apk",
          minSupportedVersionCode: 8,
        },
      },
    });

    const info = await fetchAppUpdateInfo(5);

    expect(info.forceUpdate).toBe(true);
    expect(info.minSupportedVersionCode).toBe(8);
  });

  it("treats a release without a download url as no update", async () => {
    getMock.mockResolvedValueOnce({
      data: { result: { hasUpdate: true, versionCode: 9, downloadUrl: "" } },
    });

    const info = await fetchAppUpdateInfo(5);

    expect(info.hasUpdate).toBe(false);
  });

  it("reports no update when the device is already current", async () => {
    getMock.mockResolvedValueOnce({
      data: { result: { hasUpdate: false, versionCode: 0, downloadUrl: "" } },
    });

    const info = await fetchAppUpdateInfo(5);

    expect(info.hasUpdate).toBe(false);
  });
});
