import { useEffect, useState } from "react";
import { getRevealRemoteConfig } from "../effects/revealRemote";
import { fetchWarehouseItems } from "../services/warehouseService";
import { fetchSeriesProgress } from "../services/seriesProgressService";
import { useAuthToken } from "./useAuthToken";

export type RevealCollectionEasterEggState = {
  showEasterEgg: boolean;
  collected: number;
  totalInSeries?: number;
  seriesComplete?: boolean;
};

export function useRevealCollectionEasterEgg(
  productId?: string,
  boxId?: string | null,
  enabled = true,
): RevealCollectionEasterEggState {
  const authToken = useAuthToken();
  const [state, setState] = useState<RevealCollectionEasterEggState>({
    showEasterEgg: false,
    collected: 0,
  });

  useEffect(() => {
    if (!enabled || !productId || !authToken) return;
    if (!getRevealRemoteConfig().collectionEasterEggEnabled) return;
    let cancelled = false;
    void (async () => {
      try {
        let totalInSeries: number | undefined;
        if (boxId) {
          const progress = await fetchSeriesProgress(authToken, boxId);
          if (progress) totalInSeries = progress.totalInSeries;
        }
        const { items } = await fetchWarehouseItems(authToken, false, 200, 0);
        if (cancelled) return;
        const seriesItems = boxId ? items.filter((row) => row.mysteryBoxId === boxId) : items;
        const hadProduct = seriesItems.some((row) => row.productId === productId);
        const collected = seriesItems.length;
        const nextCollected = hadProduct ? collected : collected + 1;
        const seriesComplete =
          totalInSeries != null && totalInSeries > 0 && nextCollected >= totalInSeries;
        setState({
          showEasterEgg: !hadProduct || seriesComplete,
          collected: nextCollected,
          totalInSeries,
          seriesComplete,
        });
      } catch {
        if (!cancelled) setState({ showEasterEgg: false, collected: 0 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, boxId, authToken, enabled]);

  return state;
}
