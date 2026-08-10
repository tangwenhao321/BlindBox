/** Member level derived from lucky coins (growth points) until a dedicated API exists. */
import i18n from "../i18n";

export type MemberLevelProgress = {
  level: number;
  title: string;
  currentPoints: number;
  levelFloor: number;
  nextLevelAt: number | null;
  progress: number;
};

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1600, 2500, 4000, 6500, 10000];

function memberLevelTitle(levelIndex: number): string {
  const key = `memberLevel.titles.${levelIndex}`;
  if (i18n.exists(key)) return i18n.t(key);
  return i18n.t(`memberLevel.titles.9`);
}

export function computeMemberLevelProgress(luckyCoins: number): MemberLevelProgress {
  const points = Math.max(0, Math.floor(luckyCoins));
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (points >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  const levelIndex = level - 1;
  const levelFloor = LEVEL_THRESHOLDS[levelIndex] ?? 0;
  const nextLevelAt = level < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[level] : null;
  const span = nextLevelAt != null ? nextLevelAt - levelFloor : 1;
  const progress =
    nextLevelAt == null ? 1 : Math.min(1, Math.max(0, (points - levelFloor) / Math.max(1, span)));
  return {
    level,
    title: memberLevelTitle(levelIndex),
    currentPoints: points,
    levelFloor,
    nextLevelAt,
    progress,
  };
}
