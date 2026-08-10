import type { ReactNode } from "react";
import { AppModals } from "../components/AppModals";
import { GlobalQueueEffects } from "../components/GlobalQueueEffects";
import { MainTabsView } from "../components/MainTabsView";
import { useAppShell } from "../context/AppShellContext";

export type AuthenticatedShellProps = {
  onboarding: ReactNode;
};

/** 已登录主界面：Tab 导航 + 全局弹层 + 引导 */
export function AuthenticatedShell({ onboarding }: AuthenticatedShellProps) {
  const { modalsProps } = useAppShell();

  return (
    <>
      <GlobalQueueEffects />
      <MainTabsView />
      <AppModals {...modalsProps} />
      {onboarding}
    </>
  );
}
