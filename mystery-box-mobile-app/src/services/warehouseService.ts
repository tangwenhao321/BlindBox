import { api, buildAuthHeaders } from "../api";

export type WarehouseApiItem = {
  orderId: string;
  orderStatus: string;
  orderItemId: string;
  mysteryBoxId: string | null;
  mysteryBoxName?: string | null;
  productId: string;
  productName: string;
  productCover: string | null;
  qualityType: string | null;
  source: string;
  listingId: string | null;
  pendingShipRequest?: boolean;
  mysteryBoxCover?: string | null;
  createdTime?: string | null;
  prizeCount?: number | null;
};

export type WarehouseListResult = {
  items: WarehouseApiItem[];
  approximate?: boolean;
};

function parseWarehouseItems(data: unknown): WarehouseApiItem[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items as WarehouseApiItem[];
    const wrapped = record.result as Record<string, unknown> | undefined;
    if (wrapped && Array.isArray(wrapped.items)) return wrapped.items as WarehouseApiItem[];
    if (Array.isArray(record.result)) return record.result as WarehouseApiItem[];
  }
  return [];
}

function parseApproximate(data: unknown): boolean {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const record = data as Record<string, unknown>;
  if (record.approximate === true) return true;
  const wrapped = record.result as Record<string, unknown> | undefined;
  return wrapped?.approximate === true;
}

export async function fetchWarehouseItems(
  authToken: string,
  pendingOnly = false,
  limit = 50,
  offset = 0,
): Promise<WarehouseListResult> {
  const response = await api.get<unknown>("/front/warehouse/items", {
    params: { pendingOnly, limit, offset },
    headers: buildAuthHeaders(authToken),
  });
  return {
    items: parseWarehouseItems(response.data),
    approximate: parseApproximate(response.data),
  };
}

export type WarehouseCountResult = {
  count: number;
  approximate?: boolean;
};

export async function fetchWarehouseItemCount(
  authToken: string,
  pendingOnly = false,
): Promise<WarehouseCountResult> {
  const response = await api.get<
    WarehouseCountResult | { result?: WarehouseCountResult; count?: number; approximate?: boolean }
  >("/front/warehouse/items/count", {
    params: { pendingOnly },
    headers: buildAuthHeaders(authToken),
  });
  const data = response.data;
  if (data && typeof data === "object" && "count" in data && typeof data.count === "number") {
    return { count: data.count, approximate: data.approximate === true };
  }
  if (data && typeof data === "object" && "result" in data && data.result) {
    return {
      count: data.result.count ?? 0,
      approximate: data.result.approximate === true,
    };
  }
  return { count: 0 };
}
