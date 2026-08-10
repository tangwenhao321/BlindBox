import { createContext, useContext, useMemo, type ReactNode } from "react";
import { assembleAppMainTabsInput } from "../hooks/assembleAppMainTabsInput";
import type { MainTabsBuildInput } from "../hooks/buildAppMainTabsProps";
import type {
  AppMainTabsInputSlices,
  MainTabsAccountSlice,
  MainTabsAddressFormSlice,
  MainTabsAuthSlice,
  MainTabsCatalogSearchSlice,
  MainTabsCatalogSlice,
  MainTabsCheckoutSlice,
  MainTabsNavSlice,
  MainTabsOrdersSlice,
  MainTabsShellSlice,
  MainTabsWalletSlice,
} from "../hooks/mainTabsSliceTypes";

export type {
  AppMainTabsInputSlices,
  MainTabsAccountSlice,
  MainTabsAddressFormSlice,
  MainTabsAuthSlice,
  MainTabsCatalogSearchSlice,
  MainTabsCatalogSlice,
  MainTabsCheckoutSlice,
  MainTabsNavSlice,
  MainTabsOrdersSlice,
  MainTabsShellSlice,
  MainTabsWalletSlice,
} from "../hooks/mainTabsSliceTypes";

type MainTabsContextValue = AppMainTabsInputSlices;

const MainTabsContext = createContext<MainTabsContextValue | null>(null);
const MainTabsAssembledInputContext = createContext<MainTabsBuildInput | null>(null);

export function MainTabsProvider({
  slices,
  children,
}: {
  slices: AppMainTabsInputSlices;
  children: ReactNode;
}) {
  const value = useMemo(() => slices, [slices]);
  const assembledInput = useMemo(() => assembleAppMainTabsInput(slices), [slices]);

  return (
    <MainTabsContext.Provider value={value}>
      <MainTabsAssembledInputContext.Provider value={assembledInput}>{children}</MainTabsAssembledInputContext.Provider>
    </MainTabsContext.Provider>
  );
}

export function useMainTabsSlices(): AppMainTabsInputSlices {
  const ctx = useContext(MainTabsContext);
  if (!ctx) {
    throw new Error("useMainTabsSlices must be used within MainTabsProvider");
  }
  return ctx;
}

/** Single assembled MainTabsBuildInput shared by all view-prop hooks under MainTabsProvider. */
export function useMainTabsAssembledInput(): MainTabsBuildInput {
  const ctx = useContext(MainTabsAssembledInputContext);
  if (!ctx) {
    throw new Error("useMainTabsAssembledInput must be used within MainTabsProvider");
  }
  return ctx;
}

export function useMainTabsNav(): MainTabsNavSlice {
  return useMainTabsSlices().nav;
}

export function useMainTabsAuth(): MainTabsAuthSlice {
  return useMainTabsSlices().auth;
}

export function useMainTabsWallet(): MainTabsWalletSlice {
  return useMainTabsSlices().wallet;
}

export function useMainTabsShell(): MainTabsShellSlice {
  return useMainTabsSlices().shell;
}

export function useMainTabsCatalog(): MainTabsCatalogSlice {
  return useMainTabsSlices().catalog;
}

export function useMainTabsCatalogSearch(): MainTabsCatalogSearchSlice {
  return useMainTabsSlices().catalogSearch;
}

export function useMainTabsCheckout(): MainTabsCheckoutSlice {
  return useMainTabsSlices().checkout;
}

export function useMainTabsOrders(): MainTabsOrdersSlice {
  return useMainTabsSlices().orders;
}

export function useMainTabsAccount(): MainTabsAccountSlice {
  return useMainTabsSlices().account;
}

export function useMainTabsAddressForm(): MainTabsAddressFormSlice {
  return useMainTabsSlices().addressForm;
}

/** Expo-router route stubs sit outside AppShellProvider but inside MainTabsProvider. */
export function useMainTabsRouteSyncOptional() {
  const ctx = useContext(MainTabsContext);
  if (!ctx) return null;
  return {
    navigate: ctx.nav.navigate,
    openOrderDetailsPage: ctx.orders.openOrderDetailsPage,
    openBoxDetailsPage: ctx.catalog.openDetailsPage,
    appView: ctx.nav.view,
    navigationEpoch: ctx.nav.navigationEpoch,
  };
}
