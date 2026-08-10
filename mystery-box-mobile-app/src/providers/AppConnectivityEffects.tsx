import { useOfflineReconnect } from "../hooks/useOfflineReconnect";
import { hydrateOfflineMutationQueue } from "../offline/offlineMutationQueue";
import { useEffect } from "react";
import { AppState } from "react-native";
import { recordLastActiveAt } from "../effects/revealReturnWelcome";

/** Side-effect hooks for app-wide connectivity behavior. */
export function AppConnectivityEffects() {
  useEffect(() => {
    void hydrateOfflineMutationQueue();
  }, []);

  useEffect(() => {
    void recordLastActiveAt();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void recordLastActiveAt();
    });
    return () => sub.remove();
  }, []);

  useOfflineReconnect();
  return null;
}
