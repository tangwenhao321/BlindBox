import { api, buildAuthHeaders } from "../api";
import { DEFAULT_QUERY_PAGE_NUM, DEFAULT_QUERY_PAGE_SIZE } from "../config/constants";
import type { ApiResult, MysteryBoxCategory, QueryResult } from "../types";

export async function queryBoxCategories(token: string, pageSize = DEFAULT_QUERY_PAGE_SIZE) {
  const response = await api.post<ApiResult<QueryResult<MysteryBoxCategory>>>(
    "/front/mystery-box-category/query",
    { pageNum: DEFAULT_QUERY_PAGE_NUM, pageSize, query: {} },
    { headers: buildAuthHeaders(token) },
  );
  const items = response.data.result.content ?? [];
  return items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}
