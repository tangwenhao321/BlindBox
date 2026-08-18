import { api, buildAuthHeaders } from "../api";
import { DEFAULT_QUERY_PAGE_NUM, DEFAULT_QUERY_PAGE_SIZE } from "../config/constants";
import type { ApiResult, MysteryBoxCategory, QueryResult } from "../types";

export async function queryBoxCategories(token: string, pageSize = DEFAULT_QUERY_PAGE_SIZE) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await api.post<ApiResult<QueryResult<MysteryBoxCategory>>>(
        "/front/mystery-box-category/query",
        { pageNum: DEFAULT_QUERY_PAGE_NUM, pageSize, query: {} },
        { headers: buildAuthHeaders(token) },
      );
      const items = response.data.result.content ?? [];
      return items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 280 * (attempt + 1)));
    }
  }
  throw lastError;
}
