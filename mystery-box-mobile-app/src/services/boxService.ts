import { api, buildAuthHeaders } from "../api";
import { DEFAULT_QUERY_PAGE_NUM, DEFAULT_QUERY_PAGE_SIZE } from "../config/constants";
import type { ApiResult, MysteryBox, QueryResult } from "../types";
import { dedupeMysteryBoxes } from "../utils/boxDisplay";

export type BoxQuery = {
  categoryId?: string;
  keyword?: string;
};

export async function queryBoxes(
  token: string,
  pageSize = DEFAULT_QUERY_PAGE_SIZE,
  pageNum = DEFAULT_QUERY_PAGE_NUM,
  boxQuery?: BoxQuery,
) {
  const query: Record<string, unknown> = {};
  if (boxQuery?.categoryId) {
    query.category = { id: boxQuery.categoryId };
  }
  if (boxQuery?.keyword?.trim()) {
    query.name = boxQuery.keyword.trim();
  }
  const path = boxQuery?.keyword?.trim() ? "/front/mystery-box/search" : "/front/mystery-box/query";
  const response = await api.post<ApiResult<QueryResult<MysteryBox>>>(
    path,
    { pageNum, pageSize, query },
    { headers: buildAuthHeaders(token) },
  );
  const content = dedupeMysteryBoxes(response.data.result.content ?? []);
  return { items: content, hasMore: content.length >= pageSize };
}

export async function queryRecommendedBoxes(token: string, limit = 8) {
  const response = await api.get<ApiResult<MysteryBox[]>>("/front/recommendation/mystery-box", {
    params: { limit },
    headers: buildAuthHeaders(token),
  });
  return dedupeMysteryBoxes(response.data.result ?? []);
}

export async function getBoxById(token: string, id: string) {
  const response = await api.get<ApiResult<MysteryBox>>(`/front/mystery-box/${id}`, {
    headers: buildAuthHeaders(token),
  });
  return response.data.result;
}

export async function getNewcomerOfferBox(token: string) {
  try {
    const response = await api.get<ApiResult<MysteryBox>>("/front/mystery-box/newcomer-offer", {
      headers: buildAuthHeaders(token),
    });
    if (response.data.result) return response.data.result;
  } catch {
    // fallback below
  }
  const { items } = await queryBoxes(token, 30, 1);
  const exclusive = items.find((b) => b.newcomerExclusive);
  if (exclusive) return exclusive;
  return items.sort((a, b) => a.price - b.price)[0] ?? null;
}
