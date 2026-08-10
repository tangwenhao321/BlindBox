import type { NewcomerMission } from "../services/newcomerMissionService";

export function pickLatestUnclaimedMission(missions: NewcomerMission[]): NewcomerMission | null {
  const claimable = missions.find((m) => m.unlocked && m.completed && !m.claimed);
  if (claimable) return claimable;
  return missions.find((m) => m.unlocked && !m.completed) ?? null;
}
