/**
 * Apple IAP client scaffold for VN App Store VIP (Guideline 3.1.1).
 * Default off — StoreKit + App Store Server API required before enabling.
 */
import { Platform } from "react-native";
import { api, buildAuthHeaders } from "../api";

export function isIapClientEnabled(): boolean {
  return Platform.OS === "ios" && process.env.EXPO_PUBLIC_IAP_ENABLED === "true";
}

/**
 * Placeholder purchase — throws until react-native-iap / StoreKit is integrated.
 */
export async function purchaseVipPackage(_productId: string): Promise<{
  transactionId: string;
  signedPayload: string;
}> {
  throw new Error("APPLE_IAP_CLIENT_NOT_WIRED");
}

export async function verifyVipIapWithBackend(
  token: string,
  orderId: string,
  transactionId: string,
  signedPayload: string
): Promise<void> {
  await api.post(
    `/front/vip-order/${encodeURIComponent(orderId)}/iap/verify`,
    { transactionId, signedPayload },
    { headers: buildAuthHeaders(token) }
  );
}
