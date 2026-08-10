import { api, buildAuthHeaders } from "../api";

export type TrustMeta = {
  probabilityUpdatedAt?: string | null;
  shippingPromise: string;
  minorProtectionHint: string;
  disclosureNote: string;
};

export async function fetchTrustMeta(token: string | undefined, boxId: string): Promise<TrustMeta | null> {
  try {
    const response = await api.get<{ result: TrustMeta }>(`/front/mystery-box/${boxId}/trust-meta`, {
      headers: token ? buildAuthHeaders(token) : undefined,
    });
    return response.data.result;
  } catch {
    return null;
  }
}
