import { describe, expect, it, vi } from "vitest";
import type { TFunction } from "i18next";
import { confirmLogout } from "./confirmLogout";

vi.mock("./toast", () => ({
  toast: { success: vi.fn() },
}));

const t = ((key: string) => key) as TFunction;

describe("confirmLogout", () => {
  it("does nothing when user cancels", async () => {
    const confirm = vi.fn().mockResolvedValue(false);
    const onLogout = vi.fn();

    await confirmLogout(confirm, onLogout, t);

    expect(confirm).toHaveBeenCalledWith({
      title: "auth.logoutTitle",
      message: "auth.logoutMessage",
      confirmLabel: "auth.logoutConfirm",
      destructive: true,
    });
    expect(onLogout).not.toHaveBeenCalled();
  });

  it("logs out and shows success toast when confirmed", async () => {
    const confirm = vi.fn().mockResolvedValue(true);
    const onLogout = vi.fn().mockResolvedValue(undefined);

    await confirmLogout(confirm, onLogout, t);

    expect(onLogout).toHaveBeenCalled();
  });
});
