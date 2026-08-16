import { api, buildAuthHeaders } from "../api";
import type { ApiResult } from "../types";
import { createIdempotencyKey, IDEMPOTENCY_HEADER } from "../utils/idempotencyKey";

export type FragmentSku = {
  id: string;
  name: string;
  cover: string | null;
  fragmentCost: number;
  stockRemaining: number;
};

export type FragmentProgress = {
  balance: number;
  totalSkus: number;
  affordableCount: number;
  skus: {
    id: string;
    name: string;
    cover: string | null;
    fragmentCost: number;
    stockRemaining: number;
    affordable: boolean;
    progressPercent: number;
  }[];
};

function unwrapResult<T>(data: ApiResult<T> | T): T {
  if (data && typeof data === "object" && "result" in data && (data as ApiResult<T>).result != null) {
    return (data as ApiResult<T>).result as T;
  }
  return data as T;
}

export async function fetchFragmentProgress(token: string): Promise<FragmentProgress | null> {
  try {
    const response = await api.get<ApiResult<FragmentProgress> | FragmentProgress>("/front/fragment/progress", {
      headers: buildAuthHeaders(token),
    });
    return unwrapResult(response.data);
  } catch {
    return null;
  }
}

export async function fetchFragmentBalance(token: string): Promise<number> {
  const response = await api.get<ApiResult<{ balance: number }> | { balance: number }>(
    "/front/fragment/balance",
    {
      headers: buildAuthHeaders(token),
    },
  );
  const payload = unwrapResult(response.data);
  return payload.balance ?? 0;
}

export async function fetchFragmentSkus(token: string): Promise<FragmentSku[]> {
  const response = await api.get<ApiResult<FragmentSku[]> | FragmentSku[]>("/front/fragment/exchange-skus", {
    headers: buildAuthHeaders(token),
  });
  return unwrapResult(response.data) ?? [];
}

export async function exchangeFragmentSku(
  token: string,
  skuId: string,
  options?: { idempotencySeed?: string },
): Promise<void> {
  const headers = {
    ...buildAuthHeaders(token),
    [IDEMPOTENCY_HEADER]: createIdempotencyKey(
      "fragment-exchange",
      options?.idempotencySeed ?? `${skuId}:${Date.now()}`,
    ),
  };
  await api.post(`/front/fragment/exchange/${skuId}`, {}, { headers });
}

export async function decomposeOrderItem(
  token: string,
  orderItemId: string,
  productId: string,
): Promise<void> {
  await api.post(
    "/front/fragment/decompose",
    { orderItemId, productId },
    { headers: buildAuthHeaders(token) },
  );
}

export async function claimSurpriseEffectBonus(
  token: string,
  orderId: string,
): Promise<{ fragments: number; alreadyGranted: boolean }> {
  const headers = {
    ...buildAuthHeaders(token),
    [IDEMPOTENCY_HEADER]: createIdempotencyKey("surprise-fx", orderId),
  };
  const response = await api.post<
    ApiResult<{ fragments: number; alreadyGranted: boolean }> | { fragments: number; alreadyGranted: boolean }
  >("/front/fragment/surprise-bonus", { orderId }, { headers });
  const payload = unwrapResult(response.data);
  return {
    fragments: Number(payload.fragments ?? 1) || 1,
    alreadyGranted: !!payload.alreadyGranted,
  };
}
