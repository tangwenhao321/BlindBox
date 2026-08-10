import { useLocalSearchParams } from "expo-router";
import type { AppView } from "../components/mainTabs/appViews";
import { useSyncAppViewFromRoute } from "./useSyncAppViewFromRoute";

export function createAppViewRoute(view: AppView) {
  return function AppViewRouteScreen() {
    useSyncAppViewFromRoute({ view });
    return null;
  };
}

export function createOrderDetailsRoute() {
  return function OrderDetailsRouteScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    useSyncAppViewFromRoute({ view: "orderDetails", orderId: typeof id === "string" ? id : id?.[0] });
    return null;
  };
}

export function createBoxDetailsRoute() {
  return function BoxDetailsRouteScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    useSyncAppViewFromRoute({ view: "boxDetails", boxId: typeof id === "string" ? id : id?.[0] });
    return null;
  };
}

export function createPaymentReturnRoute() {
  return function PaymentReturnRouteScreen() {
    const params = useLocalSearchParams<{ orderId?: string; vnp_TxnRef?: string; vnp_ResponseCode?: string }>();
    const orderId =
      (typeof params.orderId === "string" ? params.orderId : params.orderId?.[0]) ||
      (typeof params.vnp_TxnRef === "string" ? params.vnp_TxnRef : params.vnp_TxnRef?.[0]) ||
      "";
    const responseCode =
      typeof params.vnp_ResponseCode === "string" ? params.vnp_ResponseCode : params.vnp_ResponseCode?.[0];
    useSyncAppViewFromRoute({ view: "paymentReturn", orderId, paymentResponseCode: responseCode });
    return null;
  };
}

export function createRevealSpectatorRoute() {
  return function RevealSpectatorRouteScreen() {
    const { token } = useLocalSearchParams<{ token: string }>();
    const spectatorToken = typeof token === "string" ? token : token?.[0] ?? "";
    useSyncAppViewFromRoute({ view: "revealSpectator", spectatorToken });
    return null;
  };
}
