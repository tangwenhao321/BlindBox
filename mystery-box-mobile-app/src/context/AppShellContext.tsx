import { createContext, useContext, useMemo, type ReactNode , ComponentProps } from "react";
import { AppModals } from "../components/AppModals";
import type { AppView } from "../components/mainTabs/appViews";
import type { LoginGate } from "../shell/LoginGate";

export type AppShellContextValue = {
  resetTo: (tab: AppView) => void;
  showOnboarding: boolean;
  dismissOnboarding: () => void;
  modalsProps: ComponentProps<typeof AppModals>;
  loginGateProps: ComponentProps<typeof LoginGate>;
};

type AppShellProviderProps = AppShellContextValue & {
  children: ReactNode;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellProvider({
  resetTo,
  showOnboarding,
  dismissOnboarding,
  modalsProps,
  loginGateProps,
  children,
}: AppShellProviderProps) {
  const value = useMemo(
    () => ({ resetTo, showOnboarding, dismissOnboarding, modalsProps, loginGateProps }),
    [resetTo, showOnboarding, dismissOnboarding, modalsProps, loginGateProps],
  );

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell(): AppShellContextValue {
  const ctx = useContext(AppShellContext);
  if (!ctx) {
    throw new Error("useAppShell must be used within AppShellProvider");
  }
  return ctx;
}
