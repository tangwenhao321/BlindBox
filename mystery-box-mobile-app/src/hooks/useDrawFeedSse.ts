import { useCallback } from "react";
import { fetchDrawFeedPage, type DrawFeedItem } from "../services/drawFeedService";
import { useSsePoll } from "./useSsePoll";

export function useDrawFeedSse(
  boxId: string | null,
  enabled: boolean,
  onItems: (items: DrawFeedItem[]) => void,
) {
  const pollFetch = useCallback(async () => {
    const page = await fetchDrawFeedPage(undefined, boxId, 5);
    return page.items;
  }, [boxId]);

  const query = boxId ? `?boxId=${encodeURIComponent(boxId)}` : "";
  useSsePoll<DrawFeedItem[]>({
    path: `/front/mystery-box/draw-feed/stream${query}`,
    enabled,
    eventName: "DRAW_FEED",
    pollMs: 30000,
    pollFetch,
    onData: onItems,
  });
}
