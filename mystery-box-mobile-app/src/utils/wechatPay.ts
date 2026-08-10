import { getPaymentMode } from "../config/payment";
import { MOCK_PAYMENT_ENABLED } from "../config/constants";
import i18n from "../i18n";
import type { PrepayResult } from "../types";
import { toast } from "./toast";
import { reportAppError } from "./crashReport";

type WechatPayModule = {
  pay?: (params: Record<string, string>) => Promise<{ errCode?: number }>;
};

function loadWechatModule(): WechatPayModule | null {
  try {
    // Optional: install react-native-wechat-lib in dev/production builds (not Expo Go).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-wechat-lib") as WechatPayModule;
  } catch {
    return null;
  }
}

/**
 * Invokes native WeChat Pay when a dev/production build links the SDK module.
 * Falls back to instructing mock flow when unavailable (Expo Go).
 */
export async function invokeWechatPay(prepay: PrepayResult): Promise<boolean> {
  if (getPaymentMode() !== "wechat") {
    return false;
  }
  const WeChat = loadWechatModule();
  if (typeof WeChat?.pay !== "function") {
    const hint = MOCK_PAYMENT_ENABLED ? i18n.t("wechatPay.sdkMissingExpo") : i18n.t("wechatPay.sdkMissing");
    toast.error(hint);
    return false;
  }
  try {
    const result = await WeChat.pay({
      appId: prepay.appId ?? "",
      timeStamp: prepay.timeStamp ?? "",
      nonceStr: prepay.nonceStr ?? "",
      package: prepay.packageValue ?? "",
      signType: prepay.signType ?? "RSA",
      paySign: prepay.paySign ?? "",
    });
    return result?.errCode === 0;
  } catch (error) {
    reportAppError(error instanceof Error ? error : new Error("wechat_pay_invoke_failed"), "wechat_pay");
    toast.error(i18n.t("wechatPay.invokeFailed"));
    return false;
  }
}
