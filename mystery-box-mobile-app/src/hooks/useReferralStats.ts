import { useCallback, useEffect, useState } from "react";
import { parseError } from "../api";
import { getReferralStats, type ReferralStats } from "../services/referralService";

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { stats: ReferralStats; expiresAt: number }>();

export type ReferralStatsHook = ReturnType<typeof useReferralStats>;

export function useReferralStats(token: string) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(
    async (force = false) => {
      if (!token) {
        setStats(null);
        setLoadError(null);
        return;
      }
      const cached = cache.get(token);
      if (!force && cached && cached.expiresAt > Date.now()) {
        setStats(cached.stats);
        setLoadError(null);
        return;
      }
      setLoading(true);
      setLoadError(null);
      try {
        const next = await getReferralStats(token);
        cache.set(token, { stats: next, expiresAt: Date.now() + CACHE_TTL_MS });
        setStats(next);
      } catch (error) {
        if (cached) {
          setStats(cached.stats);
        } else {
          setStats(null);
        }
        setLoadError(parseError(error));
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { stats, loading, loadError, refresh: () => refresh(true) };
}
