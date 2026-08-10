import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "reveal_preference_asked_v1";

export async function shouldAskRevealPreference(): Promise<boolean> {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  return value !== "1";
}

export async function markRevealPreferenceAsked(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, "1");
}
