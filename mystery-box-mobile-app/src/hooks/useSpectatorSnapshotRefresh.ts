import { useEffect, useCallback, useRef, useState } from "react";
import { fetchSpectatorReveal, type SpectatorRevealFetchResult } from "../services/spectatorService";
import type { RoomProgress } from "../effects/revealSocialRoom";

export type SpectatorSnapshotStatus = "loading" | "ready" | "expired" | "error";

export function shouldRefreshSpectatorSnapshot(lastPhase: string | null, nextPhase: string | undefined): boolean {
  if (!nextPhase) return false;
  return nextPhase !== lastPhase;
}

export function useSpectatorSnapshotRefresh(token: string, progress: RoomProgress | null) {
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null);
  const [resolvedPhase, setResolvedPhase] = useState<string | undefined>();
  const [resolvedOrderId, setResolvedOrderId] = useState<string | undefined>();
  const [status, setStatus] = useState<SpectatorSnapshotStatus>("loading");
  const lastPhaseRef = useRef<string | null>(null);
  const fetchGenerationRef = useRef(0);

  const applyPayload = useCallback((data: SpectatorRevealFetchResult) => {
    if (data.status === "expired") {
      setSnapshot(null);
      setStatus("expired");
      return;
    }
    if (data.status === "error") {
      setSnapshot(null);
      setStatus("error");
      return;
    }
    setSnapshot(data.snapshot);
    setResolvedPhase(typeof data.phase === "string" ? data.phase : undefined);
    setResolvedOrderId(typeof data.orderId === "string" ? data.orderId : undefined);
    setStatus("ready");
  }, []);

  const loadSnapshot = useCallback(() => {
    const generation = ++fetchGenerationRef.current;
    setStatus((prev) => (prev === "ready" ? prev : "loading"));
    void fetchSpectatorReveal(token).then((data) => {
      if (generation !== fetchGenerationRef.current) return;
      applyPayload(data);
    });
  }, [applyPayload, token]);

  useEffect(() => {
    lastPhaseRef.current = null;
    loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    if (!progress?.phase) return;
    if (!shouldRefreshSpectatorSnapshot(lastPhaseRef.current, progress.phase)) return;
    lastPhaseRef.current = progress.phase;
    loadSnapshot();
  }, [loadSnapshot, progress?.phase]);

  return { snapshot, resolvedPhase, resolvedOrderId, status, retry: loadSnapshot };
}
