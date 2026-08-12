import { api, buildAuthHeaders } from "../api";
import { resolvePaymentMode } from "../config/payment";
import type { ApiResult, MoMoPrepayResult, PrepayResult, VNPayPrepayResult } from "../types";

export type VipProfile = {
  id?: string;
  endTime?: string;
};

export type VipPackage = {
  id: string;
  name?: string;
  price?: number;
  days?: number;
};

export type VipOrder = {
  id: string;
  baseOrder?: {
    payment?: {
      payAmount?: number;
      payTime?: string | null;
    };
  };
};

export type VipPrepayLaunch = {
  channel: "vnpay" | "momo" | "wechat" | "mock" | "other";
  paymentUrl?: string;
  deeplink?: string;
  stub?: boolean;
  wechatPrepay?: PrepayResult;
};

export async function fetchCurrentVip(token: string): Promise<VipProfile | null> {
  if (!token) return null;
  const response = await api.get<{ result: VipProfile }>("/front/vip", {
    headers: buildAuthHeaders(token),
  });
  return response.data.result ?? null;
}

export async function fetchVipPackages(token: string): Promise<VipPackage[]> {
  const response = await api.post<ApiResult<{ content?: VipPackage[] }>>(
    "/front/vip-package/query",
    { pageNum: 1, pageSize: 20, query: {} },
    { headers: buildAuthHeaders(token) },
  );
  return response.data.result?.content ?? [];
}

export async function createVipOrder(token: string, vipPackageId: string): Promise<string> {
  const response = await api.post<ApiResult<string>>(
    "/front/vip-order/create",
    { vipPackageId },
    { headers: buildAuthHeaders(token) },
  );
  const id = response.data.result?.trim();
  if (!id) throw new Error("VIP_ORDER_CREATE_FAILED");
  return id;
}

export async function fetchVipOrder(token: string, orderId: string): Promise<VipOrder> {
  const response = await api.get<ApiResult<VipOrder>>(`/front/vip-order/${orderId}`, {
    headers: buildAuthHeaders(token),
  });
  const order = response.data.result;
  if (!order?.id) throw new Error("VIP_ORDER_NOT_FOUND");
  return order;
}

export function isVipOrderPaid(order: VipOrder | null | undefined): boolean {
  return !!order?.baseOrder?.payment?.payTime;
}

export async function mockPayVipOrder(token: string, orderId: string): Promise<string> {
  const response = await api.post<ApiResult<string>>(`/front/vip-order/${orderId}/pay/mock`, null, {
    headers: buildAuthHeaders(token),
  });
  return response.data.result ?? orderId;
}

/** Channel-specific VIP prepay after {@link createVipOrder}. */
export async function prepayVipOrder(
  token: string,
  orderId: string,
  wallet: "momo" | "market" = "market",
): Promise<VipPrepayLaunch> {
  if (wallet === "momo") {
    const response = await api.post<ApiResult<MoMoPrepayResult>>(
      `/front/vip-order/${orderId}/prepay/momo`,
      null,
      { headers: buildAuthHeaders(token) },
    );
    const prepay = response.data.result;
    return { channel: "momo", deeplink: prepay?.deeplink, stub: prepay?.stub };
  }
  const mode = resolvePaymentMode();
  if (mode === "mock") {
    await mockPayVipOrder(token, orderId);
    return { channel: "mock" };
  }
  if (mode === "wechat") {
    const response = await api.post<ApiResult<PrepayResult>>(
      `/front/vip-order/${orderId}/prepay/wechat`,
      null,
      { headers: buildAuthHeaders(token) },
    );
    return { channel: "wechat", wechatPrepay: response.data.result };
  }
  const response = await api.post<ApiResult<VNPayPrepayResult>>(
    `/front/vip-order/${orderId}/prepay/vnpay`,
    null,
    { headers: buildAuthHeaders(token) },
  );
  const prepay = response.data.result;
  return { channel: mode === "vnpay" ? "vnpay" : "other", paymentUrl: prepay?.paymentUrl };
}
