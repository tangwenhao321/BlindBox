import { useCallback, useRef } from "react";
import {
  fetchMarketplaceListingChat,
  type MarketplaceChatMessage,
} from "../services/marketplaceService";
import { useSsePoll } from "./useSsePoll";

const CHAT_POLL_FALLBACK_MS = 12_000;

/** Marketplace listing chat via SSE with HTTP poll fallback. */
export function useMarketplaceChatSse(
  token: string | undefined,
  listingId: string,
  enabled: boolean,
  onMessages: (messages: MarketplaceChatMessage[]) => void,
) {
  const pollFetch = useCallback(async () => {
    if (!token) throw new Error("no token");
    return fetchMarketplaceListingChat(token, listingId);
  }, [token, listingId]);

  const onData = useCallback(
    (data: MarketplaceChatMessage[]) => {
      onMessages(Array.isArray(data) ? data : []);
    },
    [onMessages],
  );

  const degradedRef = useRef(false);
  const onPollDegraded = useCallback(() => {
    degradedRef.current = true;
  }, []);

  useSsePoll<MarketplaceChatMessage[]>({
    path: `/front/marketplace/listings/${listingId}/chat/stream`,
    token,
    enabled: enabled && !!token && !!listingId,
    eventName: "CHAT_UPDATE",
    pollMs: CHAT_POLL_FALLBACK_MS,
    pollFetch,
    onData,
    onPollDegraded,
  });
}
