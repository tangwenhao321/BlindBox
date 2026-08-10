import type { AppControllerLoadedAssembly } from "./buildAppControllerLoadedResult";
import type { AppAuthSession } from "./useAppAuthSession";
import type { LoginGateBuildInput } from "./buildAppLoginGateProps";
import type { AppMainTabsSlicesContext } from "./buildAppMainTabsSlicesFromContext";
import {
  assembleAppControllerShellContext,
  type AssembleAppControllerShellInput,
} from "./assembleAppControllerShellContext";
import type { AppView } from "../components/mainTabs/appViews";

export type AppControllerLoadedSliceInput = {
  resetTo: (tab: AppView) => void;
  showOnboarding: boolean;
  dismissOnboarding: () => void;
  authSession: AppAuthSession;
  authHandlers: LoginGateBuildInput["authHandlers"];
  mainTabs: AppMainTabsSlicesContext;
  shell: AssembleAppControllerShellInput;
};

export function assembleAppControllerLoadedAssembly(input: AppControllerLoadedSliceInput): AppControllerLoadedAssembly {
  return {
    resetTo: input.resetTo,
    showOnboarding: input.showOnboarding,
    dismissOnboarding: input.dismissOnboarding,
    authSession: input.authSession,
    authHandlers: input.authHandlers,
    mainTabs: input.mainTabs,
    shell: assembleAppControllerShellContext(input.shell),
  };
}
