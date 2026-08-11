import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "reveal_coach_seen";

export async function shouldShowRevealCoach(): Promise<boolean> {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  return value !== "1";
}

export async function markRevealCoachSeen(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, "1");
}
