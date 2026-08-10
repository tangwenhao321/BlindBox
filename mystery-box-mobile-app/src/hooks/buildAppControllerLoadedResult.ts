import { buildAppControllerViewModel } from "./buildAppControllerViewModel";
import type { AppControllerLoadedViewModel } from "./buildAppControllerLoadedViewModel";
import type { AppAuthSession } from "./useAppAuthSession";
import type { LoginGateBuildInput } from "./buildAppLoginGateProps";
import type { AppShellModalsParams } from "./buildAppShellSlices";
import type { AppMainTabsSlicesContext } from "./buildAppMainTabsSlicesFromContext";
import type { AppView } from "../components/mainTabs/appViews";

export type AppControllerLoadedAssembly = {
  resetTo: (tab: AppView) => void;
  showOnboarding: boolean;
  dismissOnboarding: () => void;
  authSession: AppAuthSession;
  authHandlers: LoginGateBuildInput["authHandlers"];
  mainTabs: AppMainTabsSlicesContext;
  shell: AppShellModalsParams;
};

export type AppControllerResult = { loading: true } | AppControllerLoadedViewModel;

export function buildAppControllerLoadedResult(
  loading: boolean,
  assembly: AppControllerLoadedAssembly,
): AppControllerResult {
  if (loading) {
    return { loading: true };
  }

  return buildAppControllerViewModel(assembly);
}
