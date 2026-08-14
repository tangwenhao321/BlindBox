import { useCallback, useEffect, useState } from "react";
import { AppState, StyleSheet, View, type AppStateStatus } from "react-native";
import { useTranslation } from "react-i18next";
import { parseError, toAppError } from "../api";
import { useAuthToken } from "../hooks/useAuthToken";
import { useMarketplaceChatSse } from "../hooks/useMarketplaceChatSse";
import { useThemedStyles } from "../hooks/useThemedStyles";
import {
  clearMarketplaceChatParams,
  peekMarketplaceChatParams,
} from "../navigation/marketplaceChatParams";
import {
  fetchMarketplaceCredit,
  fetchMarketplaceListingChat,
  postMarketplaceListingChat,
  type MarketplaceChatMessage,
} from "../services/marketplaceService";
import type { ThemeColors } from "../styles/themes";
import { reportAppError } from "../utils/crashReport";
import { toast } from "../utils/toast";
import { MarketplaceChatPanel } from "./marketplace/MarketplaceChatPanel";

const UI_TICK_MS = 5_000;

type Props = {
  listingId?: string;
  listingTitle?: string;
  onBack: () => void;
};

export function MarketplaceChatView({ listingId: listingIdProp, listingTitle: listingTitleProp, onBack }: Props) {
  const authToken = useAuthToken();
  const { t } = useTranslation();
  const styles = useThemedStyles(buildStyles);
  const stored = peekMarketplaceChatParams();
  const listingId = listingIdProp || stored?.listingId || "";
  const listingTitle = listingTitleProp || stored?.listingTitle;

  const [messages, setMessages] = useState<MarketplaceChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [pollError, setPollError] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [appActive, setAppActive] = useState(AppState.currentState === "active");

  useEffect(() => () => clearMarketplaceChatParams(), []);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => setAppActive(next === "active");
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!appActive) return;
    setNowTick(Date.now());
    const timer = setInterval(() => setNowTick(Date.now()), UI_TICK_MS);
    return () => clearInterval(timer);
  }, [appActive]);

  useEffect(() => {
    if (!authToken) {
      setMyUserId(null);
      return;
    }
    void fetchMarketplaceCredit(authToken)
      .then((c) => setMyUserId(c.userId || null))
      .catch((error) => {
        setMyUserId(null);
        reportAppError(toAppError(error), "marketplace_chat_credit");
      });
  }, [authToken]);

  const applyMessages = useCallback((msgs: MarketplaceChatMessage[]) => {
    setMessages(msgs);
    setUpdatedAt(Date.now());
    setPollError(false);
  }, []);

  useMarketplaceChatSse(authToken, listingId, !!authToken && !!listingId && appActive, applyMessages);

  const loadChat = useCallback(
    async (id: string, silent = false) => {
      if (!authToken) return;
      try {
        const msgs = await fetchMarketplaceListingChat(authToken, id);
        applyMessages(msgs);
      } catch (error) {
        if (silent) {
          setPollError(true);
          return;
        }
        reportAppError(toAppError(error), "marketplace_chat_load");
        toast.error(parseError(error));
        setPollError(true);
      }
    },
    [authToken, applyMessages],
  );

  const handleSend = async () => {
    if (!authToken || !listingId || !body.trim() || sending) return;
    setSending(true);
    try {
      await postMarketplaceListingChat(authToken, listingId, body.trim());
      setBody("");
      await loadChat(listingId);
    } catch (error) {
      reportAppError(toAppError(error), "marketplace_chat_send");
      toast.error(parseError(error));
    } finally {
      setSending(false);
    }
  };

  if (!listingId) {
    return (
      <View style={styles.root}>
        <MarketplaceChatPanel
          visible
          presentation="screen"
          listingTitle={t("marketplace.chat")}
          messages={[]}
          body=""
          sending={false}
          updatedAt={null}
          pollError
          myUserId={null}
          nowTick={nowTick}
          onChangeBody={() => {}}
          onSend={() => {}}
          onRetryPoll={onBack}
          onClose={onBack}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <MarketplaceChatPanel
        visible
        presentation="screen"
        listingTitle={listingTitle}
        messages={messages}
        body={body}
        sending={sending}
        updatedAt={updatedAt}
        pollError={pollError}
        myUserId={myUserId}
        nowTick={nowTick}
        onChangeBody={setBody}
        onSend={() => void handleSend()}
        onRetryPoll={() => void loadChat(listingId)}
        onClose={onBack}
      />
    </View>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgPage },
  });
}
