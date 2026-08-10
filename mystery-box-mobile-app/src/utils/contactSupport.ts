import { Linking, Share } from "react-native";

import { ENTERPRISE_WECHAT_ID, SUPPORT_HOTLINE, ZALO_OA_ID } from "../config/constants";
import i18n from "../i18n";
import { maskPhone } from "../order-utils";
import { toast } from "./toast";

export async function openContactSupport(phone?: string) {
  const target = phone?.trim() || SUPPORT_HOTLINE;

  if (!target) {
    toast.info(i18n.t("contact.noPhone"));
    return;
  }

  const url = `tel:${target}`;
  const canOpen = await Linking.canOpenURL(url);

  if (canOpen) {
    await Linking.openURL(url);
    return;
  }

  toast.info(i18n.t("contact.callHint", { phone: maskPhone(target) }));
}

function buildZaloOaUrl(oaId: string) {
  const id = oaId.trim();
  if (id.startsWith("http://") || id.startsWith("https://")) return id;
  const slug = id.startsWith("o") ? id : `o${id}`;
  return `https://zalo.me/${slug}`;
}

export async function openZaloSupport(oaId?: string) {
  const target = oaId?.trim() || ZALO_OA_ID;

  if (!target) {
    toast.info(i18n.t("contact.noZalo"));
    return;
  }

  const url = buildZaloOaUrl(target);
  const canOpen = await Linking.canOpenURL(url);

  if (canOpen) {
    await Linking.openURL(url);
    return;
  }

  toast.info(i18n.t("contact.zaloHint", { id: target.replace(/^o/, "") }));
}

export async function openEnterpriseWechat(wechatId?: string) {
  const target = wechatId?.trim() || ENTERPRISE_WECHAT_ID;

  if (!target) {
    toast.info(i18n.t("contact.noWecom"));
    return;
  }

  try {
    await Share.share({ message: i18n.t("contact.wecomShare", { id: target }) });
  } catch {
    toast.info(i18n.t("contact.wecomId", { id: target }));
  }
}
