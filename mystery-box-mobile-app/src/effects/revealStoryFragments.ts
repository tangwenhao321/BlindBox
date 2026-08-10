import AsyncStorage from "@react-native-async-storage/async-storage";
import { revealStorageKey } from "../utils/revealStorageNamespace";

const KEY = "story_fragments";

export type StoryFragment = {
  id: string;
  productId: string;
  text: string;
  unlockedAt: number;
};

export async function loadStoryFragments(): Promise<StoryFragment[]> {
  try {
    const raw = await AsyncStorage.getItem(revealStorageKey(KEY));
    if (!raw) return [];
    return JSON.parse(raw) as StoryFragment[];
  } catch {
    return [];
  }
}

export async function unlockStoryFragment(fragment: StoryFragment): Promise<void> {
  const list = await loadStoryFragments();
  if (list.some((f) => f.id === fragment.id)) return;
  list.unshift(fragment);
  await AsyncStorage.setItem(revealStorageKey(KEY), JSON.stringify(list.slice(0, 40)));
}
