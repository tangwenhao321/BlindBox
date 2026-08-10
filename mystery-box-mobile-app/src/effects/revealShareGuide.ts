import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "reveal_share_guide_v1";

type GuideState = {
  highRarePrompts: number;
  dismissedUntil?: number;
};

async function load(): Promise<GuideState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { highRarePrompts: 0 };
    return JSON.parse(raw) as GuideState;
  } catch {
    return { highRarePrompts: 0 };
  }
}

async function save(state: GuideState) {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}

export type ShareGuideLevel = "strong" | "weak" | "none";

export async function resolveShareGuideLevel(isHighRare: boolean, isDuplicate: boolean): Promise<ShareGuideLevel> {
  const state = await load();
  if (state.dismissedUntil && Date.now() < state.dismissedUntil) return "none";
  if (!isHighRare) return "none";
  if (isDuplicate || state.highRarePrompts >= 3) return "weak";
  return "strong";
}

export async function recordShareGuideShown(isHighRare: boolean): Promise<void> {
  if (!isHighRare) return;
  const state = await load();
  await save({ ...state, highRarePrompts: state.highRarePrompts + 1 });
}

export async function dismissShareGuideForDays(days = 7): Promise<void> {
  const state = await load();
  await save({ ...state, dismissedUntil: Date.now() + days * 86_400_000 });
}
