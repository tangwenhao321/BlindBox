import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { refreshRevealSystemAdapt } from "../effects/revealSystemAdapt";
import { refreshRevealAudioAdapt } from "../effects/revealAudioAdapt";
import { refreshRevealAudioRouteAdapt } from "../effects/revealAudioRouteAdapt";
import { scheduleRevealGc } from "../effects/revealGcScheduler";
import {
  clearRevealInterruptSnapshot,
} from "../effects/revealInterruptSnapshot";
import { cancelScheduledRevealSounds } from "../effects/sound";
import { setRevealBackgroundSleep } from "../effects/revealBackgroundSleep";
import { getRevealRemoteConfig } from "../effects/revealRemote";
import {
  buildProgressSnapshot,
  clearSeenForSession,
  markBackgroundIdle,
  markForegroundResume,
  persistRevealProgress,
  restoreRevealProgress,
  setRevealPhase,
  type RevealProgressSnapshot,
  type RevealSource,
} from "../effects/revealOrchestrator";

let revealModalIsolated = false;

export function isRevealModalIsolated(): boolean {
  return revealModalIsolated;
}

type Params = {
  enabled: boolean;
  orderId: string;
  source: RevealSource;
  revealIndex: number;
  revealedProductIds: string[];
  highlightMarkers?: number[];
  skipRemaining: boolean;
  phase: "playing" | "summary" | "idle";
  onResumeFromProgress?: (snapshot: RevealProgressSnapshot) => void;
  onBackgroundTimeout?: () => void;
};

export function useRevealLifecycle({
  enabled,
  orderId,
  source,
  revealIndex,
  revealedProductIds,
  highlightMarkers = [],
  skipRemaining,
  phase,
  onResumeFromProgress,
  onBackgroundTimeout,
}: Params) {
  const wasBackgroundRef = useRef(false);
  const resumeHandledRef = useRef(false);
  const backgroundAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !orderId) return;
    void refreshRevealAudioRouteAdapt();
    const snapshot = buildProgressSnapshot({
      orderId,
      source,
      phase: phase === "summary" ? "summary" : "playing",
      revealIndex,
      revealedProductIds,
      highlightMarkers,
      skipRemaining,
      resumeIntent: "continue",
    });
    void persistRevealProgress(snapshot);
    if (phase === "playing") setRevealPhase(orderId, "playing");
    if (phase === "summary") setRevealPhase(orderId, "summary");
  }, [enabled, orderId, source, revealIndex, revealedProductIds, highlightMarkers, skipRemaining, phase]);

  useEffect(() => {
    if (!enabled || !orderId) return;
    const onChange = (next: AppStateStatus) => {
      if (next === "background" || next === "inactive") {
        wasBackgroundRef.current = true;
        revealModalIsolated = next === "inactive";
        backgroundAtRef.current = Date.now();
        markBackgroundIdle(backgroundAtRef.current);
        cancelScheduledRevealSounds();
        setRevealBackgroundSleep(true);
        scheduleRevealGc("session_idle");
        return;
      }
      if (next === "active" && wasBackgroundRef.current) {
        wasBackgroundRef.current = false;
        revealModalIsolated = false;
        setRevealBackgroundSleep(false);
        void refreshRevealSystemAdapt();
        void refreshRevealAudioAdapt();
        void refreshRevealAudioRouteAdapt();
        scheduleRevealGc("reveal_complete");
        const bgMs = backgroundAtRef.current ? Date.now() - backgroundAtRef.current : 0;
        backgroundAtRef.current = null;
        markForegroundResume();
        const sessionResetMs = getRevealRemoteConfig().sessionIdleResetMs ?? 30 * 60 * 1000;
        if (bgMs > sessionResetMs) {
          clearSeenForSession();
          clearRevealInterruptSnapshot(orderId);
          onBackgroundTimeout?.();
          return;
        }
        const maxMs = getRevealRemoteConfig().backgroundResumeMaxMs;
        if (bgMs > maxMs) {
          clearRevealInterruptSnapshot(orderId);
          onBackgroundTimeout?.();
          return;
        }
        if (!resumeHandledRef.current) {
          void restoreRevealProgress(orderId).then((snap) => {
            if (!snap) return;
            const stale = Date.now() - (snap.updatedAt ?? 0) > maxMs * 2;
            if (stale) {
              onBackgroundTimeout?.();
              return;
            }
            if (snap.revealIndex > revealIndex && onResumeFromProgress) {
              resumeHandledRef.current = true;
              onResumeFromProgress(snap);
            }
          });
        }
      }
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [enabled, orderId, revealIndex, onResumeFromProgress, onBackgroundTimeout]);

  useFocusEffect(
    useCallback(() => {
      resumeHandledRef.current = false;
      return () => {
        if (enabled && orderId && phase === "playing") {
          setRevealPhase(orderId, "interrupted");
        }
      };
    }, [enabled, orderId, phase]),
  );
}
