import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "payment_retention_order_id";

export async function getRetentionOrderId(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export async function setRetentionOrderId(orderId: string): Promise<void> {
  await AsyncStorage.setItem(KEY, orderId);
}

export async function clearRetentionOrderId(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
