import type { TFunction } from "i18next";
import { toast } from "./toast";

type ConfirmFn = (options: {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
}) => Promise<boolean>;

export async function confirmLogout(
  confirm: ConfirmFn,
  onLogout: (() => void | Promise<void>) | undefined,
  t: TFunction,
): Promise<void> {
  if (!onLogout) return;
  const ok = await confirm({
    title: t("auth.logoutTitle"),
    message: t("auth.logoutMessage"),
    confirmLabel: t("auth.logoutConfirm"),
    destructive: true,
  });
  if (!ok) return;
  await onLogout();
  toast.success(t("auth.logoutSuccess"));
}
