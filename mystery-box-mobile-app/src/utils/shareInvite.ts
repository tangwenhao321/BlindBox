import { Share } from "react-native";
import i18n from "../i18n";
import { buildInviteShareTextLinks } from "./inviteUrl";

export async function shareInviteLink(inviteCode: string, extraLine = "") {
  const { primary, scheme } = buildInviteShareTextLinks(inviteCode);
  // Always include the app scheme deep link so installs that open mysterybox:// get the code.
  const link = primary === scheme ? primary : `${primary}\n${scheme}`;
  const message = i18n.t("promotion.shareMessage", { code: inviteCode, link, extra: extraLine });
  await Share.share({ message, title: i18n.t("promotion.shareDialogTitle") });
}
