import { api, buildAuthHeaders } from "../api";

export type HotBox = {
  id: string;
  name: string;
  cover: string;
  poolTotal?: number;
  poolRemaining: number;
  drawCount7d: number;
};

export type HomeBanner = {
  id: string;
  picture: string;
  content: string;
  navigatorId?: string | null;
  navigatorType?: string | null;
};

export type HomeSummary = {
  todayDrawCount: number;
  todayLegendaryCount: number;
  hotBoxes: HotBox[];
  recommendBoxIds: string[];
  banners?: HomeBanner[];
};

export async function fetchHomeSummary(token = ""): Promise<HomeSummary | null> {
  try {
    const headers = token ? buildAuthHeaders(token) : undefined;
    const response = await api.get<{ result?: HomeSummary } & HomeSummary>("/front/home/summary", { headers });
    return response.data.result ?? response.data;
  } catch {
    return null;
  }
}

export async function fetchHomeRecommend(): Promise<string[]> {
  try {
    const response = await api.get<{ result?: string[] } | string[]>("/front/home/recommend");
    const data = response.data;
    if (Array.isArray(data)) return data;
    return data.result ?? [];
  } catch {
    return [];
  }
}
