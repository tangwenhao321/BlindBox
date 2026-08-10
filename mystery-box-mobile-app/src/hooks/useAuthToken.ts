import { useSyncExternalStore } from "react";
import { getSessionAuthToken, subscribeSessionAuthToken } from "../utils/authTokenStore";

/** Reactive bearer token from in-memory session (updated on login/logout/restore). */
export function useAuthToken(): string {
  return useSyncExternalStore(subscribeSessionAuthToken, getSessionAuthToken, getSessionAuthToken);
}
