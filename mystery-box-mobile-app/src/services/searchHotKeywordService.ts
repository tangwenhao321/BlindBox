import { api } from "../api";

export async function fetchHotKeywords(limit = 8): Promise<string[]> {
  try {
    const response = await api.get<string[] | { result: string[] }>("/front/search/hot-keywords", {
      params: { limit },
    });
    const data = response.data;
    if (Array.isArray(data)) return data.filter(Boolean);
    return (data.result ?? []).filter(Boolean);
  } catch {
    return [];
  }
}
