import { useMainTabsAuth } from "../context/MainTabsContext";
import { useGlobalQueueMonitor } from "../hooks/useGlobalQueueMonitor";

export function GlobalQueueEffects() {
  const { token } = useMainTabsAuth();
  useGlobalQueueMonitor(token);
  return null;
}
