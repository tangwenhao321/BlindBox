import { api, buildAuthHeaders } from "../api";
import { DEFAULT_QUERY_PAGE_NUM } from "../config/constants";
import type { ApiResult, QueryResult } from "../types";

export type SlideshowItem = {
  id: string;
  picture?: string;
  content?: string;
  sort?: number;
  valid?: boolean;
};

export async function querySlideshows(token?: string, pageSize = 5) {
  const response = await api.post<ApiResult<QueryResult<SlideshowItem>>>(
    "/front/slideshow/query",
    { pageNum: DEFAULT_QUERY_PAGE_NUM, pageSize, query: {} },
    token ? { headers: buildAuthHeaders(token) } : undefined,
  );
  const items = (response.data.result.content ?? []).filter((item) => item.valid !== false);
  return items.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}
