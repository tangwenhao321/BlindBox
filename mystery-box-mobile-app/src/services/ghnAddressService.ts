import { api } from "../api";
import type { ApiResult } from "../types";

export type GhnProvince = { id: string; name: string };
export type GhnDistrict = { id: string; name: string };
export type GhnWard = { id: string; name: string };

type GhnRow = { code: string; name: string };

function mapRow(row: GhnRow): { id: string; name: string } {
  return { id: row.code, name: row.name };
}

export async function fetchGhnProvinces(): Promise<GhnProvince[]> {
  try {
    const response = await api.get<ApiResult<GhnRow[]>>("/front/logistics/ghn/provinces");
    return (response.data.result ?? []).map(mapRow);
  } catch {
    return [];
  }
}

export async function fetchGhnDistricts(provinceId: string): Promise<GhnDistrict[]> {
  if (!provinceId) return [];
  try {
    const response = await api.get<ApiResult<GhnRow[]>>("/front/logistics/ghn/districts", {
      params: { provinceCode: provinceId },
    });
    return (response.data.result ?? []).map(mapRow);
  } catch {
    return [];
  }
}

export async function fetchGhnWards(districtId: string): Promise<GhnWard[]> {
  if (!districtId) return [];
  try {
    const response = await api.get<ApiResult<GhnRow[]>>("/front/logistics/ghn/wards", {
      params: { districtCode: districtId },
    });
    return (response.data.result ?? []).map(mapRow);
  } catch {
    return [];
  }
}
