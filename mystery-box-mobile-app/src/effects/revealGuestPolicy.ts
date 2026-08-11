import { toast } from "../utils/toast";
import i18n from "../i18n";

const GUEST_REPLAY_CAP = 3;
let guestReplayCount = 0;

export function resetGuestRevealPolicyForTests(): void {
  guestReplayCount = 0;
}

export function canGuestSaveSnapshot(hasAuth: boolean): boolean {
  return hasAuth;
}

export function canGuestReplay(hasAuth: boolean): boolean {
  if (hasAuth) return true;
  return guestReplayCount < GUEST_REPLAY_CAP;
}

export function recordGuestReplay(hasAuth: boolean): void {
  if (hasAuth) return;
  guestReplayCount += 1;
}

export function notifyGuestRevealBlocked(kind: "replay" | "snapshot"): void {
  const key =
    kind === "replay" ? "revealOverlay.guestReplayLimited" : "revealOverlay.guestSnapshotLimited";
  toast.revealHint(i18n.t(key));
}
