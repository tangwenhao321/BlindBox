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

/**
 * Many Android builds report Wi‑Fi as "no internet" when captive-portal
 * probes fail, even though the LAN API is reachable. Treat wifi/ethernet/vpn as online.
 */
export function isEffectivelyOnline(state: NetInfoState): boolean {
  const connected = state.isConnected !== false;
  if (!connected) return false;
  const type = state.type;
  if (type === "wifi" || type === "ethernet" || type === "vpn") return true;
  if (state.isInternetReachable === false) return false;
  return true;
}

function resolveNetworkTierFromState(state: NetInfoState): RevealNetworkTier {
  if (!isEffectivelyOnline(state)) return "offline";
  const type = state.type;
  if (type === "wifi" || type === "ethernet" || type === "vpn") return "wifi";
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
    setRevealNetworkTier(resolveNetworkTierFromState(state));
    emit(!isEffectivelyOnline(state));
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
