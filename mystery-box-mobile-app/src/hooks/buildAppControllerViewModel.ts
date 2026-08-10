import type { AppControllerLoadedViewModel } from "./buildAppControllerLoadedViewModel";
import { buildAppControllerLoadedViewModel } from "./buildAppControllerLoadedViewModel";
import { buildAppMainTabsSlicesFromContext, type AppMainTabsSlicesContext } from "./buildAppMainTabsSlicesFromContext";
import type { AppShellModalsParams } from "./buildAppShellSlices";
import type { AppAuthSession } from "./useAppAuthSession";
import type { LoginGateBuildInput } from "./buildAppLoginGateProps";
import type { AppView } from "../components/mainTabs/appViews";

export type AppControllerViewContext = {
  resetTo: (tab: AppView) => void;
  showOnboarding: boolean;
  dismissOnboarding: () => void;
  mainTabs: AppMainTabsSlicesContext;
  shell: AppShellModalsParams;
  authSession: AppAuthSession;
  authHandlers: LoginGateBuildInput["authHandlers"];
};

export function buildAppControllerViewModel(ctx: AppControllerViewContext): AppControllerLoadedViewModel {
  return buildAppControllerLoadedViewModel({
    resetTo: ctx.resetTo,
    showOnboarding: ctx.showOnboarding,
    dismissOnboarding: ctx.dismissOnboarding,
    mainTabs: buildAppMainTabsSlicesFromContext(ctx.mainTabs),
    shellModals: ctx.shell,
    authSession: ctx.authSession,
    authHandlers: ctx.authHandlers,
  });
}
