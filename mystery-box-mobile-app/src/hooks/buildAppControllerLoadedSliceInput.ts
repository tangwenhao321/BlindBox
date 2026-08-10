import type { AppControllerLoadedSliceInput } from "./assembleAppControllerLoadedAssembly";
import type { AppMainTabsShellContext } from "./buildAppMainTabsSlicesFromContext";
import type {
  MainTabsAccountSlice,
  MainTabsAddressFormSlice,
  MainTabsAuthSlice,
  MainTabsCatalogSlice,
  MainTabsCatalogSearchSlice,
  MainTabsCheckoutSlice,
  MainTabsNavSlice,
  MainTabsOrdersSlice,
  MainTabsWalletSlice,
} from "./mainTabsSliceTypes";
import type { AssembleAppControllerShellInput } from "./assembleAppControllerShellContext";
import type { AppAuthSession } from "./useAppAuthSession";
import type { LoginGateBuildInput } from "./buildAppLoginGateProps";
import type { AppView } from "../components/mainTabs/appViews";

export type AppControllerRuntimeState = {
  resetTo: (tab: AppView) => void;
  showOnboarding: boolean;
  dismissOnboarding: () => void;
  authSession: AppAuthSession;
  authHandlers: LoginGateBuildInput["authHandlers"];
  nav: MainTabsNavSlice;
  auth: MainTabsAuthSlice;
  wallet: MainTabsWalletSlice;
  tabsShell: AppMainTabsShellContext;
  catalog: MainTabsCatalogSlice;
  catalogSearch: MainTabsCatalogSearchSlice;
  checkout: MainTabsCheckoutSlice;
  orderList: MainTabsOrdersSlice;
  account: MainTabsAccountSlice;
  addressForm: MainTabsAddressFormSlice;
  shell: AssembleAppControllerShellInput;
};

export function buildAppControllerLoadedSliceInput(runtime: AppControllerRuntimeState): AppControllerLoadedSliceInput {
  const { resetTo, showOnboarding, dismissOnboarding, authSession, authHandlers, nav, auth, wallet, tabsShell, catalog, catalogSearch, checkout, orderList, account, addressForm, shell } =
    runtime;

  return {
    resetTo,
    showOnboarding,
    dismissOnboarding,
    authSession,
    authHandlers,
    mainTabs: {
      nav,
      auth,
      wallet,
      shell: tabsShell,
      catalog,
      catalogSearch,
      checkout,
      orders: orderList,
      account,
      addressForm,
    },
    shell,
  };
}
