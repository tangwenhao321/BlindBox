import i18n from "../i18n";

/** Mock / WeChat / VNPay — keep in sync with checkout modals */
export type PaymentMode = "mock" | "wechat" | "vnpay";

export const PAYMENT_CHANNEL = "wechat_mock" as const;

export function getPaymentMode(): PaymentMode {
  const mode = process.env.EXPO_PUBLIC_PAYMENT_MODE?.trim().toLowerCase();
  if (mode === "wechat") return "wechat";
  if (mode === "vnpay") return "vnpay";
  if (mode === "mock") return "mock";
  const defaultLocale = process.env.EXPO_PUBLIC_DEFAULT_LOCALE?.trim();
  if (defaultLocale === "vi-VN" && !__DEV__) return "vnpay";
  return __DEV__ ? "mock" : "wechat";
}

let remotePaymentMode: PaymentMode | null = null;

/** Hydrate from /front/app/config (P1 public config). */
export function setRemotePaymentMode(mode: PaymentMode | null) {
  remotePaymentMode = mode;
}

export function resolvePaymentMode(): PaymentMode {
  if (remotePaymentMode) return remotePaymentMode;
  return getPaymentMode();
}

export function getPaymentMethodLabel() {
  const mode = resolvePaymentMode();
  if (mode === "mock") return i18n.t("payment.methodMock");
  if (mode === "vnpay") return i18n.t("payment.methodVnpay");
  return i18n.t("payment.methodWechat");
}

export function getPaymentMethodHint() {
  const mode = resolvePaymentMode();
  if (mode === "mock") return i18n.t("payment.methodHintMock");
  if (mode === "vnpay") return i18n.t("payment.methodHintVnpay");
  return i18n.t("payment.methodHintWechat");
}

export function getWechatSdkAvailable(): boolean {
  try {
    require.resolve("react-native-wechat-lib");
    return true;
  } catch {
    return false;
  }
}

export const PRODUCTION_PAYMENT_CHECKLIST = [
  "payment.prodChecklistMerchant",
  "payment.prodChecklistMode",
  "payment.prodChecklistDevClient",
  "payment.prodChecklistPrepay",
] as const;

export const PRODUCTION_PAYMENT_CHECKLIST_VNPAY = [
  "payment.prodChecklistMerchantVnpay",
  "payment.prodChecklistModeVnpay",
  "payment.prodChecklistDevClientVnpay",
  "payment.prodChecklistPrepayVnpay",
] as const;

export function getProductionPaymentChecklistLines(): string[] {
  const keys = resolvePaymentMode() === "vnpay" ? PRODUCTION_PAYMENT_CHECKLIST_VNPAY : PRODUCTION_PAYMENT_CHECKLIST;
  return keys.map((key) => i18n.t(key));
}
