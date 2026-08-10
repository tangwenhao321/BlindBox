import i18n from "../i18n";
import { offlineKindToActionKey } from "./offlineKindActionKey";
import type { OfflineMutationKind } from "../offline/offlineMutationTypes";

/** Resolve offline action key or legacy label for display. */
export function resolveOfflineActionLabel(actionKeyOrLabel: string): string {
  if (i18n.exists(actionKeyOrLabel)) return i18n.t(actionKeyOrLabel);
  return actionKeyOrLabel;
}

/** Resolve label for a persisted offline mutation (kind-aware). */
export function resolveOfflineMutationLabel(kind: OfflineMutationKind, storedLabel: string): string {
  const key = offlineKindToActionKey(kind);
  if (storedLabel === key || storedLabel.startsWith("offline.") || i18n.exists(storedLabel)) {
    return resolveOfflineActionLabel(storedLabel.startsWith("offline.") ? storedLabel : key);
  }
  return resolveOfflineActionLabel(key);
}
