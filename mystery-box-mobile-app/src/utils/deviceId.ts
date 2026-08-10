import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_ID_KEY = "device_id_v1";

let memoryFallbackId: string | null = null;

export async function getOrCreateDeviceId(): Promise<string> {
  if (memoryFallbackId) {
    return memoryFallbackId;
  }
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) {
      memoryFallbackId = existing;
      return existing;
    }
    const generated = `mb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
    memoryFallbackId = generated;
    return generated;
  } catch {
    memoryFallbackId = `mb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return memoryFallbackId;
  }
}
