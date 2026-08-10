import AsyncStorage from "@react-native-async-storage/async-storage";
import { revealStorageKey } from "../utils/revealStorageNamespace";

const KEY = "share_achievements";

export type ShareAchievementType = "first_share" | "rare_share" | "series_share" | "streak_share";

export type ShareAchievement = {
  type: ShareAchievementType;
  recordedAt: number;
};

export async function recordShareAchievement(type: ShareAchievementType): Promise<void> {
  const list = await listShareAchievements();
  if (list.some((a) => a.type === type)) return;
  list.unshift({ type, recordedAt: Date.now() });
  await AsyncStorage.setItem(revealStorageKey(KEY), JSON.stringify(list.slice(0, 20)));
}

export async function listShareAchievements(): Promise<ShareAchievement[]> {
  try {
    const raw = await AsyncStorage.getItem(revealStorageKey(KEY));
    if (!raw) return [];
    return JSON.parse(raw) as ShareAchievement[];
  } catch {
    return [];
  }
}
