import { captureRef } from "react-native-view-shot";
import type { RefObject } from "react";
import type { View } from "react-native";
import * as Sharing from "expo-sharing";

export async function captureShareCard(ref: RefObject<View | null>): Promise<string | null> {
  if (!ref.current) return null;
  const uri = await captureRef(ref, { format: "png", quality: 0.95 });
  return uri;
}

export async function shareCapturedUri(uri: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "image/png" });
  }
}
