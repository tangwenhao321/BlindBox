import { api, buildAuthHeaders } from "../api";
import { DEFAULT_QUERY_PAGE_NUM, DEFAULT_QUERY_PAGE_SIZE, ORDER_LIST_PAGE_SIZE } from "../config/constants";
import i18n from "../i18n";
import { getOrCreateDeviceId } from "../utils/deviceId";
import { createIdempotencyKey, IDEMPOTENCY_HEADER, type IdempotencyScope } from "../utils/idempotencyKey";
import { takeVariant as takeRecommendVariant } from "../utils/lastRecommendAttribution";
import type { ApiResult, Order, PaymentPriceView, PrepayResult, QueryResult, VNPayPrepayResult } from "../types";

function defaultOrderRemark() {
  return i18n.t("orderUtils.boxOrderDefault");
}

export type DrawMode = "instant" | "queue" | "buyout" | "cabinet";

type OrderRequestOptions = {
  riskConfirm?: boolean;
  drawMode?: DrawMode;
  slotNo?: number;
  /** Home recommend A/B variant; when omitted, taken from lastRecommendAttribution for this box. */
  recommendVariant?: string;
  idempotencyScope?: IdempotencyScope;
  idempotencySeed?: string;
};

type OrderPayload = {
  addressId?: string;
  boxId: string;
  mysteryBoxCount: number;
  couponUserId?: string;
  remark?: string;
};

function buildOrderBody(payload: OrderPayload) {
  return {
    baseOrder: {
      ...(payload.addressId ? { addressId: payload.addressId } : {}),
      remark: payload.remark || defaultOrderRemark(),
      ...(payload.couponUserId ? { couponUserId: payload.couponUserId } : {}),
    },
    items: [{ mysteryBoxId: payload.boxId, mysteryBoxCount: payload.mysteryBoxCount }],
  };
}

async function buildOrderHeaders(
  token: string,
  options?: OrderRequestOptions & {
    idempotencyScope?: IdempotencyScope;
    idempotencySeed?: string;
  },
) {
  const deviceId = await getOrCreateDeviceId();
  const headers: Record<string, string> = {
    ...buildAuthHeaders(token),
    "x-device-id": deviceId,
  };
  if (options?.idempotencyScope) {
    headers[IDEMPOTENCY_HEADER] = createIdempotencyKey(options.idempotencyScope, options.idempotencySeed);
  }
  if (options?.riskConfirm) {
    headers["x-risk-confirm"] = "CONFIRM";
  }
  if (options?.drawMode) {
    headers["x-draw-mode"] = options.drawMode;
  }
  if (options?.slotNo != null && options.slotNo > 0) {
    headers["x-slot-no"] = String(options.slotNo);
  }
  if (options?.recommendVariant?.trim()) {
    headers["x-recommend-variant"] = options.recommendVariant.trim();
  }
  // Client entropy for fairness commit = sha256(seed|nonce); keep locally to verify after reveal.
  headers["x-client-fairness-nonce"] = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return headers;
}

export async function queryOrders(token: string, pageSize = ORDER_LIST_PAGE_SIZE, pageNum = DEFAULT_QUERY_PAGE_NUM) {
  const response = await api.post<ApiResult<QueryResult<Order>>>(
    "/front/mystery-box-order/query",
    { pageNum, pageSize, query: {} },
    { headers: buildAuthHeaders(token) },
  );
  const content = response.data.result.content ?? [];
  return { items: content, hasMore: content.length >= pageSize };
}

export type OrderDrawIntegrity = {
  ok: boolean;
  expectedDrawCount: number;
  actualPrizeCount: number;
  issueCount: number;
  message: string;
  issues: string[];
};

export async function fetchOrderDrawIntegrity(token: string, orderId: string) {
  const response = await api.get<ApiResult<OrderDrawIntegrity>>(
    `/front/mystery-box-order/${orderId}/draw-integrity`,
    { headers: buildAuthHeaders(token) },
  );
  return response.data.result;
}

export async function getOrderById(token: string, id: string) {
  const response = await api.get<ApiResult<Order>>(`/front/mystery-box-order/${id}`, {
    headers: buildAuthHeaders(token),
  });
  return response.data.result;
}

export async function calculateOrderPrice(
  token: string,
  boxId: string,
  addressId: string | undefined,
  mysteryBoxCount = 1,
  couponUserId?: string,
  // Kept for call-site compat; retention is original-order only and ignored on new quotes.
  _retentionOrderId?: string | null,
) {
  const response = await api.post<ApiResult<PaymentPriceView>>(
    "/front/mystery-box-order/calculate",
    buildOrderBody({ addressId, boxId, mysteryBoxCount, couponUserId }),
    {
      headers: buildAuthHeaders(token),
      params: { autoCoupon: true },
    },
  );
  return response.data.result;
}

export async function createOrder(
  token: string,
  boxId: string,
  addressId: string | undefined,
  mysteryBoxCount = 1,
  options?: OrderRequestOptions & { couponUserId?: string },
) {
  const recommendVariant =
    options?.recommendVariant?.trim() || takeRecommendVariant(boxId) || undefined;
  const response = await api.post<ApiResult<string>>(
    "/front/mystery-box-order/create",
    buildOrderBody({
      addressId,
      boxId,
      mysteryBoxCount,
      couponUserId: options?.couponUserId,
    }),
    {
      headers: await buildOrderHeaders(token, {
        ...options,
        recommendVariant,
        idempotencyScope: "create-order",
        idempotencySeed: `${boxId}:${addressId ?? "none"}:${mysteryBoxCount}`,
      }),
      // Query param is the body-field alternative (Jimmer Input rejects unknown JSON keys).
      params: recommendVariant ? { recommendVariant } : undefined,
    },
  );
  return response.data.result;
}

export async function cancelUnpaidOrderById(token: string, id: string) {
  const response = await api.post<ApiResult<string>>(
    `/front/mystery-box-order/${id}/unpaid/cancel/user`,
    {},
    { headers: buildAuthHeaders(token) },
  );
  return response.data.result;
}

export async function mockPayOrder(token: string, id: string, options?: OrderRequestOptions) {
  const response = await api.post<ApiResult<string>>(
    `/front/mystery-box-order/${id}/pay/mock`,
    {},
    {
      headers: await buildOrderHeaders(token, {
        ...options,
        idempotencyScope: "pay-order",
        idempotencySeed: id,
      }),
    },
  );
  return response.data.result;
}

export async function getWechatPrepayParams(token: string, id: string, options?: OrderRequestOptions) {
  const response = await api.post<ApiResult<PrepayResult>>(
    `/front/mystery-box-order/${id}/prepay/wechat`,
    {},
    {
      headers: await buildOrderHeaders(token, {
        ...options,
        idempotencyScope: "prepay-wechat",
        idempotencySeed: options?.idempotencySeed ?? id,
      }),
    },
  );
  return response.data.result;
}

export async function retryWechatPrepayParams(token: string, id: string, options?: OrderRequestOptions) {
  const response = await api.post<ApiResult<PrepayResult>>(
    `/front/mystery-box-order/${id}/prepay/wechat/retry`,
    {},
    {
      headers: await buildOrderHeaders(token, {
        ...options,
        idempotencyScope: "prepay-wechat",
        idempotencySeed: options?.idempotencySeed ?? `${id}:retry`,
      }),
    },
  );
  return response.data.result;
}

export async function getVNPayPrepayParams(token: string, id: string, options?: OrderRequestOptions) {
  const response = await api.post<ApiResult<VNPayPrepayResult>>(
    `/front/mystery-box-order/${id}/prepay/vnpay`,
    {},
    {
      headers: await buildOrderHeaders(token, {
        ...options,
        idempotencyScope: "prepay-vnpay",
        idempotencySeed: options?.idempotencySeed ?? id,
      }),
    },
  );
  return response.data.result;
}

export async function retryVNPayPrepayParams(token: string, id: string, options?: OrderRequestOptions) {
  const response = await api.post<ApiResult<VNPayPrepayResult>>(
    `/front/mystery-box-order/${id}/prepay/vnpay/retry`,
    {},
    {
      headers: await buildOrderHeaders(token, {
        ...options,
        idempotencyScope: "prepay-vnpay",
        idempotencySeed: options?.idempotencySeed ?? `${id}:retry`,
      }),
    },
  );
  return response.data.result;
}

export async function getMoMoPrepayParams(token: string, id: string, options?: OrderRequestOptions) {
  const response = await api.post<ApiResult<import("../types").MoMoPrepayResult>>(
    `/front/mystery-box-order/${id}/prepay/momo`,
    {},
    {
      headers: await buildOrderHeaders(token, {
        ...options,
        idempotencyScope: "prepay-vnpay",
        idempotencySeed: options?.idempotencySeed ?? `${id}:momo`,
      }),
    },
  );
  return response.data.result;
}

export async function retryMoMoPrepayParams(token: string, id: string, options?: OrderRequestOptions) {
  const response = await api.post<ApiResult<import("../types").MoMoPrepayResult>>(
    `/front/mystery-box-order/${id}/prepay/momo/retry`,
    {},
    {
      headers: await buildOrderHeaders(token, {
        ...options,
        idempotencyScope: "prepay-vnpay",
        idempotencySeed: options?.idempotencySeed ?? `${id}:momo-retry`,
      }),
    },
  );
  return response.data.result;
}

export async function confirmReceiveOrder(token: string, id: string) {
  const response = await api.post<ApiResult<string>>(
    `/front/mystery-box-order/${id}/confirm-receive/user`,
    {},
    { headers: buildAuthHeaders(token) },
  );
  return response.data.result;
}

export async function redeemOrderItemToBalance(token: string, itemId: string, productId: string) {
  const response = await api.post<ApiResult<number>>(
    `/front/mystery-box-order-item/${itemId}/redeem-balance`,
    { productId },
    {
      headers: await buildOrderHeaders(token, {
        idempotencyScope: "redeem-item",
        idempotencySeed: `${itemId}:${productId}`,
      }),
    },
  );
  return response.data.result;
}

export async function redeemOrderToBalance(token: string, id: string) {
  const response = await api.post<ApiResult<number>>(
    `/front/mystery-box-order/${id}/redeem/balance`,
    {},
    {
      headers: await buildOrderHeaders(token, {
        idempotencyScope: "redeem-order",
        idempotencySeed: id,
      }),
    },
  );
  return response.data.result;
}

export const isRiskConfirmRequired = (message: string) =>
  message.includes("x-risk-confirm") || message.includes("高风险");
