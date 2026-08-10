import { api, buildAuthHeaders } from "../api";

export type PoolSlotStatus = "AVAILABLE" | "RESERVED" | "SOLD";

export type PoolSlot = {
  slotNo: number;
  status: PoolSlotStatus;
  reservedByUserId?: string | null;
  reservedUntil?: string | null;
};

export type PoolSlotGrid = {
  mysteryBoxId: string;
  slots: PoolSlot[];
};

export async function fetchPoolSlots(token: string, boxId: string): Promise<PoolSlotGrid> {
  const response = await api.get<{ result?: PoolSlotGrid } & PoolSlotGrid>(`/front/mystery-box/${boxId}/slots`, {
    headers: buildAuthHeaders(token),
  });
  const payload = response.data.result ?? response.data;
  return {
    mysteryBoxId: payload.mysteryBoxId ?? boxId,
    slots: payload.slots ?? [],
  };
}

export async function reservePoolSlot(token: string, boxId: string, slotNo: number): Promise<PoolSlot> {
  const response = await api.post<{ result: PoolSlot }>(`/front/mystery-box/${boxId}/slots/${slotNo}/reserve`, {}, {
    headers: buildAuthHeaders(token),
  });
  return response.data.result;
}

export async function releasePoolSlotReserve(token: string, boxId: string): Promise<void> {
  await api.delete(`/front/mystery-box/${boxId}/slots/reserve`, { headers: buildAuthHeaders(token) });
}
