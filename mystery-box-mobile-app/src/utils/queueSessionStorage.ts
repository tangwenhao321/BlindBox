import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "active_draw_queue_session_v1";

export type QueueSession = {
  boxId: string;
  boxName: string;
};

export async function getActiveQueueSession(): Promise<QueueSession | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QueueSession;
    return parsed?.boxId ? parsed : null;
  } catch {
    return null;
  }
}

export async function setActiveQueueSession(session: QueueSession): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(session));
}

export async function clearActiveQueueSession(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
