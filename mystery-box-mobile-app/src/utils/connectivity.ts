import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { setRevealWeakNetworkMode } from "../effects/revealWeakNetwork";
import { setRevealNetworkTier, type RevealNetworkTier } from "../effects/revealNetworkTier";
import { flushRevealQueue } from "../effects/revealOfflineQueue";

type Listener = (offline: boolean) => void;

let offline = false;
const listeners = new Set<Listener>();
let netInfoSubscribed = false;

function emit(offlineNext: boolean) {
  const wasOffline = offline;
  if (offline === offlineNext) {
    setRevealWeakNetworkMode(offlineNext);
    return;
  }
  offline = offlineNext;
  setRevealWeakNetworkMode(offlineNext);
  if (wasOffline && !offlineNext) {
    void flushRevealQueue(() => undefined);
  }
  listeners.forEach((listener) => listener(offline));
}

function resolveNetworkTierFromState(state: NetInfoState): RevealNetworkTier {
  const connected = state.isConnected ?? true;
  const reachable =
    state.isInternetReachable === null || state.isInternetReachable === undefined
      ? connected
      : state.isInternetReachable;
  if (!connected || !reachable) return "offline";
  const type = state.type;
  if (type === "wifi" || type === "ethernet") return "wifi";
  return "cellular";
}

export function isOffline(): boolean {
  return offline;
}

export function setOffline(next: boolean) {
  emit(next);
}

export function subscribeOffline(listener: Listener): () => void {
  listeners.add(listener);
  listener(offline);
  ensureNetInfoSubscription();
  return () => listeners.delete(listener);
}

function ensureNetInfoSubscription() {
  if (netInfoSubscribed) return;
  netInfoSubscribed = true;
  NetInfo.addEventListener((state: NetInfoState) => {
    const connected = state.isConnected ?? true;
    const reachable =
      state.isInternetReachable === null || state.isInternetReachable === undefined
        ? connected
        : state.isInternetReachable;
    setRevealNetworkTier(resolveNetworkTierFromState(state));
    emit(!(connected && reachable));
  });
}

export function isNetworkErrorMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("无法连接") ||
    lower.includes("network") ||
    lower.includes("timeout") ||
    lower.includes("网络")
  );
}
