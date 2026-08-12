import { useCallback } from "react";
import { fetchDrawFeedPage, type DrawFeedItem } from "../services/drawFeedService";
import { useAuthToken } from "./useAuthToken";
import { useSsePoll } from "./useSsePoll";

export function useDrawFeedSse(
  boxId: string | null,
  enabled: boolean,
  onItems: (items: DrawFeedItem[]) => void,
) {
  const token = useAuthToken();
  const pollFetch = useCallback(async () => {
    const page = await fetchDrawFeedPage(token || undefined, boxId, 5);
    return page.items;
  }, [boxId, token]);

  const query = boxId ? `?boxId=${encodeURIComponent(boxId)}` : "";
  useSsePoll<DrawFeedItem[]>({
    path: `/front/mystery-box/draw-feed/stream${query}`,
    token: token || undefined,
    // When prod requires auth, guests fall back to poll via 401 retries.
    enabled,
    eventName: "DRAW_FEED",
    pollMs: 30000,
    pollFetch,
    onData: onItems,
  });
}
