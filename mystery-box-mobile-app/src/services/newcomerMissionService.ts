import { api, buildAuthHeaders } from "../api";

export type NewcomerMission = {
  id: string;
  dayIndex: number;
  missionKey: string;
  title: string;
  target: number;
  progress: number;
  completed: boolean;
  unlocked: boolean;
  claimed: boolean;
  claimedAt?: string | null;
  rewardCoins: number;
  rewardHintCards: number;
};

export async function fetchNewcomerMissions(token: string): Promise<NewcomerMission[]> {
  const response = await api.get<NewcomerMission[] | { result: NewcomerMission[] }>("/front/newcomer/missions", {
    headers: buildAuthHeaders(token),
  });
  const data = response.data;
  return Array.isArray(data) ? data : (data.result ?? []);
}

export async function claimNewcomerMission(token: string, missionId: string): Promise<NewcomerMission> {
  const response = await api.post<NewcomerMission | { result: NewcomerMission }>(
    `/front/newcomer/missions/${missionId}/claim`,
    {},
    { headers: buildAuthHeaders(token) },
  );
  const data = response.data;
  return "result" in data && data.result ? data.result : (data as NewcomerMission);
}
