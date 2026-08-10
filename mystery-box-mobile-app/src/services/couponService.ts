import { api, buildAuthHeaders } from "../api";
import { DEFAULT_QUERY_PAGE_NUM, DEFAULT_QUERY_PAGE_SIZE } from "../config/constants";
import type { ApiResult, CouponItem, QueryResult } from "../types";

export async function queryUserCoupons(token: string) {
  const response = await api.post<ApiResult<QueryResult<CouponItem>>>(
    "/front/coupon-user-rel/query",
    { pageNum: DEFAULT_QUERY_PAGE_NUM, pageSize: DEFAULT_QUERY_PAGE_SIZE, query: {} },
    { headers: buildAuthHeaders(token) },
  );
  return response.data.result.content ?? [];
}
