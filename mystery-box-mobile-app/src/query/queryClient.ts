import { AppState, type AppStateStatus, Platform } from "react-native";
import { QueryClient, focusManager, onlineManager } from "@tanstack/react-query";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { isEffectivelyOnline, setOffline } from "../utils/connectivity";

let focusManagerWired = false;

function wireFocusManager() {
  if (focusManagerWired || Platform.OS === "web") return;
  if (typeof AppState?.addEventListener !== "function") return;
  focusManagerWired = true;
  AppState.addEventListener("change", (status: AppStateStatus) => {
    focusManager.setFocused(status === "active");
  });
  focusManager.setFocused(AppState.currentState === "active");
}

let onlineManagerWired = false;

function wireOnlineManager() {
  if (onlineManagerWired) return;
  onlineManagerWired = true;
  onlineManager.setEventListener((setOnline) => {
    return NetInfo.addEventListener((state: NetInfoState) => {
      const online = isEffectivelyOnline(state);
      setOnline(online);
      setOffline(!online);
    });
  });
}

wireOnlineManager();
wireFocusManager();

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      networkMode: "offlineFirst",
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});
