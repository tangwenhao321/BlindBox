import type { MainTabsBuildInput } from "./buildAppMainTabsProps";
import type { AppMainTabsInputSlices } from "./mainTabsSliceTypes";

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
} from "./mainTabsSliceTypes";

export function assembleAppMainTabsInput(slices: AppMainTabsInputSlices): MainTabsBuildInput {
  const { checkout } = slices;
  return {
    ...slices.nav,
    ...slices.auth,
    ...slices.wallet,
    ...slices.shell,
    ...slices.catalog,
    ...slices.catalogSearch,
    ...checkout,
    ...slices.orders,
    ...slices.account,
    ...slices.addressForm,
    setPendingCheckoutResumeOnBack: () => checkout.setPendingCheckoutResume(false),
  };
}
