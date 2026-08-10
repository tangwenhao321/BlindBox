import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "onboarding_coach_done_v1";
const WAREHOUSE_COACH_KEY = "onboarding_coach_warehouse_pending_v1";

export async function shouldShowOnboardingCoach(skipForExperiencedUser = false) {
  if (skipForExperiencedUser) return false;
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  return value !== "1";
}

export async function markOnboardingCoachDone() {
  await AsyncStorage.setItem(STORAGE_KEY, "1");
  await AsyncStorage.removeItem(WAREHOUSE_COACH_KEY);
}

export async function scheduleWarehouseCoachStep(skipForExperiencedUser = false) {
  if (skipForExperiencedUser) return;
  const done = await AsyncStorage.getItem(STORAGE_KEY);
  if (done === "1") return;
  await AsyncStorage.setItem(WAREHOUSE_COACH_KEY, "1");
}

export async function consumeWarehouseCoachStep() {
  const pending = await AsyncStorage.getItem(WAREHOUSE_COACH_KEY);
  if (pending !== "1") return false;
  await AsyncStorage.removeItem(WAREHOUSE_COACH_KEY);
  return true;
}
