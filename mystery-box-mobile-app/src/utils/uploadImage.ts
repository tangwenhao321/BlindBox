import * as ImagePicker from "expo-image-picker";
import i18n from "../i18n";
import { parseError } from "../api";
import { uploadImageFile } from "../services/ossService";
import { toast } from "./toast";

export async function pickAndUploadImage(token: string, options?: { allowsMultiple?: boolean }) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    toast.info(i18n.t("upload.permissionRequired"));
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.85,
    allowsMultipleSelection: options?.allowsMultiple ?? false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.uri) return null;
  const name = asset.fileName || `image-${Date.now()}.jpg`;
  try {
    const url = await uploadImageFile(token, asset.uri, name);
    return url;
  } catch (error) {
    toast.error(parseError(error));
    return null;
  }
}
