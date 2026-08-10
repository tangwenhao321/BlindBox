import { api } from "../api";

export type SeriesProgress = {
  collected: number;
  totalInSeries: number;
};

export async function fetchSeriesProgress(authToken: string, boxId: string): Promise<SeriesProgress | null> {
  try {
    const response = await api.get<{ result: SeriesProgress }>("/front/warehouse/series-progress", {
      params: { boxId },
      headers: { Authorization: authToken },
    });
    return response.data.result ?? null;
  } catch {
    return null;
  }
}
