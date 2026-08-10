import { api } from "../api";

export type MysteryBoxActivity = {
  id: string;
  title: string;
  banner: string | null;
  subtitle: string | null;
  endTime: string;
  boxIds: string[];
};

export type ActivityBoxSummary = {
  id: string;
  name: string;
  cover: string | null;
  price: number;
};

export type MysteryBoxActivityDetail = MysteryBoxActivity & {
  boxes: ActivityBoxSummary[];
};

export async function fetchActiveActivities(): Promise<MysteryBoxActivity[]> {
  try {
    const response = await api.get<{ result: MysteryBoxActivity[] }>("/front/activities/active");
    return response.data.result ?? [];
  } catch {
    return [];
  }
}

export async function fetchActivityDetail(id: string): Promise<MysteryBoxActivityDetail | null> {
  try {
    const response = await api.get<{ result: MysteryBoxActivityDetail }>(`/front/activities/${id}`);
    return response.data.result ?? null;
  } catch {
    return null;
  }
}
