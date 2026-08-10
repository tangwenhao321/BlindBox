import { api, buildAuthHeaders } from "../api";

export type DrawFeedItem = {
  id: string;
  displayName: string;
  productName: string;
  qualityType: string;
  lastOne: boolean;
  createdTime: string;
};

export type DrawFeedPage = {
  items: DrawFeedItem[];
  nextCursor: string | null;
};

export async function fetchDrawFeedPage(
  token: string | undefined,
  boxId: string | null,
  limit = 20,
  cursor?: string | null,
): Promise<DrawFeedPage> {
  try {
    const path = boxId ? `/front/mystery-box/${boxId}/draw-feed` : "/front/mystery-box/draw-feed";
    const response = await api.get<{ result: DrawFeedPage }>(path, {
      params: { limit, cursor: cursor || undefined },
      headers: token ? buildAuthHeaders(token) : undefined,
    });
    const page = response.data.result;
    return { items: page?.items ?? [], nextCursor: page?.nextCursor ?? null };
  } catch {
    return { items: [], nextCursor: null };
  }
}

export async function fetchDrawFeed(
  token: string | undefined,
  boxId: string | null,
  limit = 20,
): Promise<DrawFeedItem[]> {
  const page = await fetchDrawFeedPage(token, boxId, limit);
  return page.items;
}
