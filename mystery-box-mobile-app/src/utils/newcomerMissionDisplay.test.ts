import { describe, expect, it } from "vitest";
import { pickLatestUnclaimedMission } from "./newcomerMissionDisplay";
import type { NewcomerMission } from "../services/newcomerMissionService";

function mission(partial: Partial<NewcomerMission> & Pick<NewcomerMission, "id" | "title">): NewcomerMission {
  return {
    dayIndex: 1,
    missionKey: "draw",
    target: 1,
    progress: 0,
    completed: false,
    unlocked: true,
    claimed: false,
    rewardCoins: 0,
    rewardHintCards: 0,
    ...partial,
  };
}

describe("pickLatestUnclaimedMission", () => {
  it("prefers completed but unclaimed missions", () => {
    const rows = [
      mission({ id: "1", title: "Day 1", completed: true, claimed: true }),
      mission({ id: "2", title: "Day 2", completed: true, claimed: false }),
    ];
    expect(pickLatestUnclaimedMission(rows)?.title).toBe("Day 2");
  });

  it("falls back to next unlocked mission", () => {
    const rows = [mission({ id: "1", title: "Day 1", completed: false, claimed: false })];
    expect(pickLatestUnclaimedMission(rows)?.title).toBe("Day 1");
  });
});
