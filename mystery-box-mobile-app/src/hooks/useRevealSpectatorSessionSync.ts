import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "../types";
import { buildLiveSpectatorSnapshot } from "../effects/revealSpectatorSnapshot";
import {
  createSpectatorToken,
  fetchActiveSpectatorToken,
  updateSpectatorToken,
} from "../services/spectatorService";

const PATCH_DEBOUNCE_MS = 400;

function resolveFinalSpectatorPhase(phase: string | null): string {
  return phase === "summary" ? "summary" : "idle";
}

export { resolveFinalSpectatorPhase };

type Params = {
  enabled: boolean;
  authToken?: string | null;
  orderId: string;
  boxId?: string;
  revealIndex: number;
  total: number;
  products: Product[];
  currentProduct?: Product | null;
  phase: string | null;
};

export function useRevealSpectatorSessionSync({
  enabled,
  authToken,
  orderId,
  boxId,
  revealIndex,
  total,
  products,
  currentProduct,
  phase,
}: Params) {
  const tokenRef = useRef<string | null>(null);
  const orderIdRef = useRef(orderId);
  const lastPatchKeyRef = useRef("");
  const patchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [spectatorShareToken, setSpectatorShareToken] = useState<string | null>(null);

  const buildSnapshot = useCallback(
    () =>
      buildLiveSpectatorSnapshot({
        revealIndex,
        total,
        products,
        current: currentProduct,
      }),
    [revealIndex, total, products, currentProduct],
  );

  useEffect(() => {
    if (orderIdRef.current !== orderId) {
      orderIdRef.current = orderId;
      tokenRef.current = null;
      lastPatchKeyRef.current = "";
      setSpectatorShareToken(null);
    }
  }, [orderId]);

  useEffect(() => {
    if (!enabled || !authToken) {
      tokenRef.current = null;
      lastPatchKeyRef.current = "";
      setSpectatorShareToken(null);
      return;
    }
    if (tokenRef.current) return;

    let cancelled = false;
    const bootstrap = async () => {
      const active = await fetchActiveSpectatorToken(authToken, orderId);
      if (cancelled) return;
      if (active) {
        tokenRef.current = active;
        setSpectatorShareToken(active);
        return;
      }
      const token = await createSpectatorToken(authToken, {
        orderId,
        boxId,
        phase: phase ?? "playing",
        snapshot: buildSnapshot(),
      });
      if (cancelled || !token) return;
      tokenRef.current = token;
      setSpectatorShareToken(token);
    };
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [enabled, authToken, orderId, boxId, buildSnapshot, phase]);

  useEffect(() => {
    const token = tokenRef.current;
    if (!enabled || !authToken || !token || phase == null) return;

    const patchKey = JSON.stringify({ phase, snapshot: buildSnapshot() });
    if (patchKey === lastPatchKeyRef.current) return;

    if (patchTimerRef.current) {
      clearTimeout(patchTimerRef.current);
    }
    patchTimerRef.current = setTimeout(() => {
      lastPatchKeyRef.current = patchKey;
      void updateSpectatorToken(authToken, token, {
        phase,
        snapshot: buildSnapshot(),
      });
    }, PATCH_DEBOUNCE_MS);

    return () => {
      if (patchTimerRef.current) {
        clearTimeout(patchTimerRef.current);
        patchTimerRef.current = null;
      }
    };
  }, [enabled, authToken, phase, buildSnapshot]);

  useEffect(() => {
    if (enabled) return;
    if (patchTimerRef.current) {
      clearTimeout(patchTimerRef.current);
      patchTimerRef.current = null;
    }
    const token = tokenRef.current;
    if (!authToken || !token) return;
    void updateSpectatorToken(authToken, token, {
      phase: resolveFinalSpectatorPhase(phase),
      snapshot: buildSnapshot(),
    });
  }, [enabled, authToken, phase, buildSnapshot]);

  return { spectatorShareToken };
}
