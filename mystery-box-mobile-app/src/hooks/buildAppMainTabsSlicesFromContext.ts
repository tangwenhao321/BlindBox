import { computeMyOrdersTabCounts } from "../utils/orderDisplayRows";
import { computeOrderBadges } from "../utils/orderBadges";
import type { TabKey } from "../components/ui/BottomTabBar";
import type { WarehouseApiItem } from "../services/warehouseService";
import type { Order } from "../types";
import type { AppMainTabsInputSlices ,
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

export type AppMainTabsShellContext = {
  orders: Order[];
  setGlobalErrors: (messages: string[]) => void;
  pageLoading: boolean;
  globalErrors: string[];
  refreshAllWithLoading: (
    token: string,
    options?: { includeHeavy?: boolean; includeMall?: boolean },
  ) => Promise<void>;
  warehousePendingCount: number;
  warehousePendingCountApproximate?: boolean;
  warehouseTotalCount?: number;
  warehouseTotalCountApproximate?: boolean;
  warehouseOrderItems?: WarehouseApiItem[];
  onTabFocus?: (tab: TabKey) => void;
};

export type AppMainTabsSlicesContext = {
  nav: MainTabsNavSlice;
  auth: MainTabsAuthSlice;
  wallet: MainTabsWalletSlice;
  shell: AppMainTabsShellContext;
  catalog: MainTabsCatalogSlice;
  catalogSearch: MainTabsCatalogSearchSlice;
  checkout: MainTabsCheckoutSlice;
  orders: MainTabsOrdersSlice;
  account: MainTabsAccountSlice;
  addressForm: MainTabsAddressFormSlice;
};

export function buildAppMainTabsSlicesFromContext(ctx: AppMainTabsSlicesContext): AppMainTabsInputSlices {
  const { shell, ...rest } = ctx;
  const warehouseOrderItems = shell.warehouseOrderItems ?? [];
  const orderBadges = computeOrderBadges(shell.orders, warehouseOrderItems);
  const orderTabCounts = computeMyOrdersTabCounts(shell.orders, warehouseOrderItems, {
    warehouseTotalCount: shell.warehouseTotalCount,
  });
  const { orders: _orders, ...shellFields } = shell;

  return {
    ...rest,
    shell: { ...shellFields, orderBadges, orderTabCounts },
  };
}
