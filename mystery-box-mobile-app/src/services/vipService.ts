import { api, buildAuthHeaders } from "../api";

export type VipProfile = {
  id?: string;
  endTime?: string;
};

export async function fetchCurrentVip(token: string): Promise<VipProfile | null> {
  try {
    const response = await api.get<{ result: VipProfile }>("/front/vip", {
      headers: buildAuthHeaders(token),
    });
    return response.data.result;
  } catch {
    return null;
  }
}
