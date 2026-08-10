import { Share } from "react-native";
import i18n from "../i18n";
import { buildInviteUrl } from "./inviteUrl";

export async function shareInviteLink(inviteCode: string, extraLine = "") {
  const link = buildInviteUrl(inviteCode);
  const message = i18n.t("promotion.shareMessage", { code: inviteCode, link, extra: extraLine });
  await Share.share({ message, title: i18n.t("promotion.shareDialogTitle") });
}
