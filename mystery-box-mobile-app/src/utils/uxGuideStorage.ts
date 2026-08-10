import AsyncStorage from "@react-native-async-storage/async-storage";

const WAREHOUSE_GUIDE_KEY = "ux_guide_warehouse_v1";
const MARKETPLACE_GUIDE_KEY = "ux_guide_marketplace_v1";
const PROD_ENV_BANNER_KEY = "ux_prod_env_banner_dismissed_v1";

export async function shouldShowWarehouseGuide(): Promise<boolean> {
  return (await AsyncStorage.getItem(WAREHOUSE_GUIDE_KEY)) !== "1";
}

export async function dismissWarehouseGuide(): Promise<void> {
  await AsyncStorage.setItem(WAREHOUSE_GUIDE_KEY, "1");
}

export async function shouldShowMarketplaceGuide(): Promise<boolean> {
  return (await AsyncStorage.getItem(MARKETPLACE_GUIDE_KEY)) !== "1";
}

export async function dismissMarketplaceGuide(): Promise<void> {
  await AsyncStorage.setItem(MARKETPLACE_GUIDE_KEY, "1");
}

export async function shouldShowProductionEnvBanner(): Promise<boolean> {
  return (await AsyncStorage.getItem(PROD_ENV_BANNER_KEY)) !== "1";
}

export async function dismissProductionEnvBanner(): Promise<void> {
  await AsyncStorage.setItem(PROD_ENV_BANNER_KEY, "1");
}
