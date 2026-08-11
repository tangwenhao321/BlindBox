import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "pending_invite_code_v1";

/** Persist invite attribution across app kill until register/bind. */
export async function loadPendingInviteCode(): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return (raw ?? "").trim();
  } catch {
    return "";
  }
}

export async function savePendingInviteCode(code: string): Promise<void> {
  const trimmed = code.trim();
  try {
    if (!trimmed) {
      await AsyncStorage.removeItem(KEY);
      return;
    }
    await AsyncStorage.setItem(KEY, trimmed);
  } catch {
    // private mode / quota — session state still works for this launch
  }
}

export async function clearPendingInviteCode(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
