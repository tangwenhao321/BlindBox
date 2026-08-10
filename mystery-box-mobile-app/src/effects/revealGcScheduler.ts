import { clearSnapshotCache, pruneSnapshots } from "./revealSnapshotCache";
import { flushExpiredRevealDraws } from "./revealAssetManager";
import { CACHE_TTL, pruneThemedAssets } from "./revealCacheRegistry";

export type RevealGcEvent = "reveal_complete" | "session_idle" | "memory_warning";

export function scheduleRevealGc(event: RevealGcEvent): void {
  if (event === "reveal_complete") {
    flushExpiredRevealDraws();
    return;
  }
  if (event === "session_idle") {
    void pruneSnapshots(CACHE_TTL.SNAPSHOT_MS)
      .then(() => pruneThemedAssets())
      .then(() => flushExpiredRevealDraws());
    return;
  }
  void clearSnapshotCache().then(() => flushExpiredRevealDraws());
}
