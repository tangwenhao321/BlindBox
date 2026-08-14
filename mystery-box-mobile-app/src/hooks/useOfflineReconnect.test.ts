import { beforeEach, describe, expect, it, vi } from "vitest";

import { useOfflineReconnect } from "./useOfflineReconnect";

const mocks = vi.hoisted(() => ({
  flushMock: vi.fn(),
  toastSuccess: vi.fn(),
  toastInfo: vi.fn(),
  invalidateMock: vi.fn(),
  offlineListener: undefined as ((offline: boolean) => void) | undefined,
}));

vi.mock("../offline/offlineMutationQueue", () => ({
  flushOfflineMutationQueue: (...args: unknown[]) => mocks.flushMock(...args),
}));

vi.mock("../utils/connectivity", () => ({
  subscribeOffline: (listener: (offline: boolean) => void) => {
    mocks.offlineListener = listener;
    return () => {
      mocks.offlineListener = undefined;
    };
  },
}));

vi.mock("../utils/toast", () => ({
  toast: {
    success: (...args: unknown[]) => mocks.toastSuccess(...args),
    info: (...args: unknown[]) => mocks.toastInfo(...args),
  },
}));

vi.mock("../query/queryClient", () => ({
  queryClient: { invalidateQueries: (...args: unknown[]) => mocks.invalidateMock(...args) },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === "offline.syncSuccess") return `已同步 ${opts?.count} 项离线操作`;
      if (key === "offline.syncPartialFail") return "部分离线操作同步失败，请稍后重试";
      return key;
    },
  }),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useEffect: (fn: () => void | (() => void)) => {
      fn();
    },
  };
});

function mountHook() {
  useOfflineReconnect();
}

describe("useOfflineReconnect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.flushMock.mockResolvedValue({ processed: 0, stoppedOnError: false });
    mocks.offlineListener = undefined;
  });

  it("registers connectivity listener", () => {
    mountHook();
    expect(typeof mocks.offlineListener).toBe("function");
  });

  it("flushes queue and toasts when reconnecting", async () => {
    mocks.flushMock.mockResolvedValueOnce({ processed: 2, stoppedOnError: false });
    mountHook();
    mocks.offlineListener?.(true);
    mocks.offlineListener?.(false);
    await Promise.resolve();
    expect(mocks.flushMock).toHaveBeenCalled();
    expect(mocks.toastSuccess).toHaveBeenCalledWith("已同步 2 项离线操作");
    expect(mocks.invalidateMock).toHaveBeenCalled();
  });

  it("shows info toast when flush stops on error", async () => {
    mocks.flushMock.mockResolvedValueOnce({ processed: 0, stoppedOnError: true });
    mountHook();
    mocks.offlineListener?.(true);
    mocks.offlineListener?.(false);
    await Promise.resolve();
    expect(mocks.toastInfo).toHaveBeenCalledWith("部分离线操作同步失败，请稍后重试");
  });
});
