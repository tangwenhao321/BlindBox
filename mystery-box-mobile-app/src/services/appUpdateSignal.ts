/**
 * Bridge between an incoming APP_UPDATE push and the update controller.
 *
 * The push payload deliberately carries no download URL — it only tells the app that a release
 * exists. The controller still calls `/front/app/update-check` so channel routing, the forced
 * update floor and the "already installed" check all stay on the server side.
 */
type Listener = (versionCode: number) => void;

const listeners = new Set<Listener>();
let pendingVersionCode: number | null = null;

export function subscribeAppUpdateRequests(listener: Listener): () => void {
  listeners.add(listener);
  if (pendingVersionCode != null) {
    const queued = pendingVersionCode;
    pendingVersionCode = null;
    listener(queued);
  }
  return () => {
    listeners.delete(listener);
  };
}

export function requestAppUpdateCheck(versionCode = 0) {
  if (listeners.size === 0) {
    // Push can arrive before the provider mounts (cold start from a notification tap).
    pendingVersionCode = versionCode;
    return;
  }
  for (const listener of listeners) {
    listener(versionCode);
  }
}

export function resetAppUpdateSignal() {
  listeners.clear();
  pendingVersionCode = null;
}
