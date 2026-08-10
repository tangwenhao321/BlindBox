import { describe, expect, it, vi } from "vitest";
import { isNetworkErrorMessage, setOffline, subscribeOffline } from "./connectivity";

describe("connectivity", () => {
  it("notifies subscribers when offline changes", () => {
    const listener = vi.fn();
    const unsub = subscribeOffline(listener);
    expect(listener).toHaveBeenCalledWith(false);
    setOffline(true);
    expect(listener).toHaveBeenLastCalledWith(true);
    unsub();
    setOffline(false);
  });

  it("detects network error messages", () => {
    expect(isNetworkErrorMessage("无法连接后端 http://127.0.0.1:9912")).toBe(true);
    expect(isNetworkErrorMessage("业务错误")).toBe(false);
  });
});
