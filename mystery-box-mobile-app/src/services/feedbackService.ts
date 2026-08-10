import { api, buildAuthHeaders } from "../api";
import { DEFAULT_QUERY_PAGE_NUM, DEFAULT_QUERY_PAGE_SIZE } from "../config/constants";
import type { ApiResult, FeedbackItem, QueryResult } from "../types";

export async function queryMyFeedback(token: string, pageSize = DEFAULT_QUERY_PAGE_SIZE) {
  const response = await api.post<ApiResult<QueryResult<FeedbackItem>>>(
    "/front/feedback/query",
    { pageNum: DEFAULT_QUERY_PAGE_NUM, pageSize, query: {} },
    { headers: buildAuthHeaders(token) },
  );
  return response.data.result.content ?? [];
}

export async function submitFeedback(token: string, content: string, pictures?: string[]) {
  const response = await api.post<ApiResult<string>>(
    "/front/feedback/save",
    { content, pictures: pictures?.filter(Boolean) },
    { headers: buildAuthHeaders(token) },
  );
  return response.data.result;
}
