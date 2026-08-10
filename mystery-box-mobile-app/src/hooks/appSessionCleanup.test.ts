import { describe, expect, it, vi } from "vitest";
import { clearAppSession } from "./appSessionCleanup";

vi.mock("../utils/toast", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("../utils/crashMonitoring", () => ({
  clearCrashMonitoringUser: vi.fn(),
}));

describe("clearAppSession", () => {
  it("resets client state on logout", async () => {
    const deps = {
      logout: vi.fn().mockResolvedValue(undefined),
      clearAll: vi.fn(),
      resetWallet: vi.fn(),
      clearHomeBanner: vi.fn(),
      resetCouponSelection: vi.fn(),
      setActiveBox: vi.fn(),
      setSelectedOrder: vi.fn(),
      resetTo: vi.fn(),
    };

    await clearAppSession(deps, { toastUnauthorized: true });

    expect(deps.logout).toHaveBeenCalled();
    expect(deps.clearAll).toHaveBeenCalled();
    expect(deps.resetWallet).toHaveBeenCalled();
    expect(deps.clearHomeBanner).toHaveBeenCalled();
    expect(deps.resetCouponSelection).toHaveBeenCalled();
    expect(deps.setActiveBox).toHaveBeenCalledWith(null);
    expect(deps.setSelectedOrder).toHaveBeenCalledWith(null);
    expect(deps.resetTo).toHaveBeenCalledWith("home");
  });
});
