import { enqueueOfflineMutation } from "../offline/offlineMutationQueue";
import type { OfflinePersistInput } from "../offline/offlineMutationTypes";
import i18n from "../i18n";
import { resolveOfflineActionLabel } from "./offlineActionLabel";
import { isOffline } from "./connectivity";
import { toast } from "./toast";

/** Returns true when submit should be blocked (caller should return early). */
export function blockOfflineSubmit(actionKey = "offline.actionDefault"): boolean {
  if (!isOffline()) return false;
  const action = resolveOfflineActionLabel(actionKey);
  toast.info(i18n.t("offline.blockSubmit", { action }));
  return true;
}

/**
 * When offline, enqueue the mutation for replay on reconnect and return true.
 * Pass `persist` to survive process restarts (AsyncStorage-backed).
 * `actionKey` is stored as an i18n key for locale-safe replay UI.
 */
export function queueIfOffline(
  actionKey: string,
  run: () => Promise<void>,
  persist?: OfflinePersistInput,
): boolean {
  if (!isOffline()) return false;
  try {
    enqueueOfflineMutation(actionKey, run, persist);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "offline.money_kind_disabled" || message === "offline.mock_payment_disabled") {
      toast.info(i18n.t("offline.blockSubmit", { action: resolveOfflineActionLabel(actionKey) }));
      return true;
    }
    throw error;
  }
  const action = resolveOfflineActionLabel(actionKey);
  toast.info(i18n.t("offline.queuedSubmitDetail", { action }));
  return true;
}
