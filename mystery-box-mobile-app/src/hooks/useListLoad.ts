import { useCallback, useState } from "react";
import { parseError } from "../api";

/** Shared load-error state for list screens (banner + hide empty state). */
export function useListLoad() {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clearError = useCallback(() => setLoadError(null), []);

  const runLoad = useCallback(async (fn: () => Promise<void>) => {
    setLoadError(null);
    setLoading(true);
    try {
      await fn();
    } catch (error) {
      setLoadError(parseError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  return { loadError, setLoadError, loading, setLoading, clearError, runLoad };
}
