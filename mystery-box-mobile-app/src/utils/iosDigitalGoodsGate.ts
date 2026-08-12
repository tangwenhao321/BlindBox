import { Platform } from "react-native";

/**
 * App Store Guideline 3.1.1 — digital goods / wallet loops on iOS.
 * Physical shipping remains allowed; VIP / redeem / decompose-exchange / balance marketplace are restricted.
 */
export function isIosDigitalGoodsRestricted(): boolean {
  return Platform.OS === "ios";
}
