import { Linking, Share } from "react-native";

/** Open Zalo share via OA deep link when configured, otherwise zalo.me fallback. */
export async function shareViaZalo(message: string, zaloOaId?: string, inviteUrl?: string) {
  const body = inviteUrl ? `${message}\n${inviteUrl}` : message;
  const encoded = encodeURIComponent(body);
  const oaId = zaloOaId?.trim() || process.env.EXPO_PUBLIC_ZALO_OA_ID?.trim();
  const url = oaId ? `https://zalo.me/${oaId}` : `https://zalo.me/share?text=${encoded}`;
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
  } catch {
    // fall through to system share
  }
  await Share.share({ message: body });
  return false;
}

export function buildZaloShareUrl(message: string, zaloOaId?: string) {
  const oaId = zaloOaId?.trim() || process.env.EXPO_PUBLIC_ZALO_OA_ID?.trim();
  if (oaId) return `https://zalo.me/${oaId}`;
  return `https://zalo.me/share?text=${encodeURIComponent(message)}`;
}
