import { api, buildAuthHeaders, parseError } from "../api";
import i18n from "../i18n";
import type { ApiResult } from "../types";

export async function uploadImageFile(token: string, localUri: string, fileName = "upload.jpg") {
  const form = new FormData();
  form.append("file", {
    uri: localUri,
    name: fileName,
    type: localUri.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
  } as unknown as Blob);
  try {
    const response = await api.post<ApiResult<string>>("/oss/upload", form, {
      headers: {
        ...buildAuthHeaders(token),
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000,
    });
    const url = response.data.result;
    if (!url || typeof url !== "string") {
      throw new Error(i18n.t("oss.noUrl"));
    }
    return url;
  } catch (error) {
    throw new Error(parseError(error));
  }
}
