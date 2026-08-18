import { api, buildAuthHeaders } from "../api";
import { DEFAULT_QUERY_PAGE_NUM, DEFAULT_QUERY_PAGE_SIZE } from "../config/constants";
import type { Address, ApiResult, QueryResult } from "../types";

export async function queryAddresses(token: string) {
  const response = await api.post<ApiResult<QueryResult<Address>>>(
    "/front/address/query",
    { pageNum: DEFAULT_QUERY_PAGE_NUM, pageSize: DEFAULT_QUERY_PAGE_SIZE, query: {} },
    { headers: buildAuthHeaders(token) },
  );
  return response.data.result.content ?? [];
}

export async function saveAddressForUser(
  token: string,
  payload: {
    id?: string;
    realName: string;
    phoneNumber: string;
    details: string;
    houseNumber: string;
    province?: string;
    city?: string;
    district?: string;
    latitude?: number;
    longitude?: number;
    top?: boolean;
  },
) {
  const region = (payload.province ?? "").trim();
  const response = await api.post<ApiResult<string>>(
    "/front/address/save",
    {
      ...payload,
      province: region,
      city: (payload.city ?? "").trim() || region,
      district: (payload.district ?? "").trim(),
      latitude: payload.latitude ?? 0,
      longitude: payload.longitude ?? 0,
      top: payload.top ?? false,
    },
    { headers: buildAuthHeaders(token) },
  );
  return response.data.result;
}

export async function deleteAddresses(token: string, ids: string[]) {
  const response = await api.delete<ApiResult<boolean>>("/front/address", {
    data: ids,
    headers: buildAuthHeaders(token),
  });
  return response.data.result;
}

export async function setDefaultAddress(token: string, id: string) {
  const response = await api.post<ApiResult<boolean>>(
    `/front/address/top?id=${encodeURIComponent(id)}`,
    {},
    { headers: buildAuthHeaders(token) },
  );
  return response.data.result;
}
