import { API_BASE_URL } from "../api";
import type { AppView } from "../components/mainTabs/appViews";
import type { AppMainTabsInputSlices } from "./mainTabsSliceTypes";
import { assembleAppShellInput } from "./assembleAppShellInput";
import { buildAppShellLoginSlice, buildAppShellModalsSlice, type AppShellModalsParams } from "./buildAppShellSlices";
import { buildAppShellProps } from "./buildAppShellProps";
import type { AppAuthSession } from "./useAppAuthSession";
import type { LoginGateBuildInput } from "./buildAppLoginGateProps";
import type { ComponentProps } from "react";
import type { AppModals } from "../components/AppModals";
import type { LoginGate } from "../shell/LoginGate";

export type AppControllerLoadedViewModel = {
  loading: false;
  resetTo: (tab: AppView) => void;
  mainTabsSlices: AppMainTabsInputSlices;
  modalsProps: ComponentProps<typeof AppModals>;
  loginGateProps: ComponentProps<typeof LoginGate>;
  showOnboarding: boolean;
  dismissOnboarding: () => void;
};

export type BuildAppControllerLoadedParams = {
  resetTo: (tab: AppView) => void;
  showOnboarding: boolean;
  dismissOnboarding: () => void;
  mainTabs: AppMainTabsInputSlices;
  shellModals: AppShellModalsParams;
  authSession: AppAuthSession;
  authHandlers: LoginGateBuildInput["authHandlers"];
};

export function buildAppControllerLoadedViewModel(params: BuildAppControllerLoadedParams): AppControllerLoadedViewModel {
  const { resetTo, showOnboarding, dismissOnboarding, mainTabs, shellModals, authSession, authHandlers } = params;

  return {
    loading: false,
    resetTo,
    showOnboarding,
    dismissOnboarding,
    mainTabsSlices: mainTabs,
    ...buildAppShellProps(
      assembleAppShellInput(buildAppShellModalsSlice(shellModals), buildAppShellLoginSlice(authSession, API_BASE_URL, authHandlers)),
    ),
  };
}
