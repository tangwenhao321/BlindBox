import AsyncStorage from "@react-native-async-storage/async-storage";

const REMINDER_KEY = "pending_payment_reminder_order";

/** 本地待支付提醒：记录订单 id，由 App 前台轮询或下次启动提示（不依赖远程 Push） */
export async function rememberPendingPaymentOrder(orderId: string) {
  await AsyncStorage.setItem(REMINDER_KEY, orderId);
}

export async function clearPendingPaymentReminder() {
  await AsyncStorage.removeItem(REMINDER_KEY);
}

export async function loadPendingPaymentReminderOrderId() {
  return AsyncStorage.getItem(REMINDER_KEY);
}
