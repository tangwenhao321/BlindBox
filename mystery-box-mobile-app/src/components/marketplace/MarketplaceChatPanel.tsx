import { useEffect, useMemo, useRef } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { MarketplaceChatMessage } from "../../services/marketplaceService";
import { useAppTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { font, radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  visible: boolean;
  /** `modal` = bottom sheet overlay; `screen` = full AppView (no Modal). */
  presentation?: "modal" | "screen";
  listingTitle?: string;
  messages: MarketplaceChatMessage[];
  body: string;
  sending: boolean;
  updatedAt: number | null;
  pollError: boolean;
  myUserId?: string | null;
  nowTick: number;
  onChangeBody: (text: string) => void;
  onSend: () => void;
  onRetryPoll: () => void;
  onClose: () => void;
};

function formatChatUpdatedLabel(
  updatedAt: number,
  nowMs: number,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const elapsedSec = Math.max(0, Math.floor((nowMs - updatedAt) / 1000));
  if (elapsedSec < 8) return t("marketplace.chatUpdatedJustNow");
  if (elapsedSec < 60) {
    return t("marketplace.chatUpdatedSeconds", { count: elapsedSec });
  }
  const mins = Math.floor(elapsedSec / 60);
  return t("marketplace.chatUpdatedMinutes", { count: mins });
}

function formatChatSenderLabel(
  msg: MarketplaceChatMessage,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const nick = (msg.nickname ?? msg.name)?.trim();
  if (nick) return nick;
  const id = msg.userId?.trim() ?? "";
  const suffix = id.length >= 2 ? id.slice(-2) : id || "??";
  return t("marketplace.chatUserMasked", { suffix });
}

function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function MarketplaceChatPanel({
  visible,
  presentation = "modal",
  listingTitle,
  messages,
  body,
  sending,
  updatedAt,
  pollError,
  myUserId,
  nowTick,
  onChangeBody,
  onSend,
  onRetryPoll,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildChatPanelStyles);
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<MarketplaceChatMessage>>(null);
  const isScreen = presentation === "screen";

  const thread = useMemo(() => {
    const copy = [...messages];
    copy.reverse();
    return copy;
  }, [messages]);

  useEffect(() => {
    if (!visible || thread.length === 0) return;
    const id = requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
    return () => cancelAnimationFrame(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps
  }, [visible, thread.length, messages[0]?.id]);

  const renderItem: ListRenderItem<MarketplaceChatMessage> = ({ item }) => {
    const mine = Boolean(myUserId && item.userId && item.userId === myUserId);
    const time = formatMsgTime(item.createdTime);
    return (
      <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
        {!mine ? (
          <Text style={styles.nick} numberOfLines={1}>
            {formatChatSenderLabel(item, t)}
          </Text>
        ) : null}
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
          <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : null]}>{item.body}</Text>
        </View>
        {time ? <Text style={[styles.time, mine ? styles.timeMine : null]}>{time}</Text> : null}
      </View>
    );
  };

  const panel = (
    <View
      style={[
        isScreen ? styles.screenSheet : styles.sheet,
        { paddingBottom: Math.max(insets.bottom, spacing.sm) },
      ]}
    >
      {isScreen ? null : <View style={styles.handle} />}
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {t("marketplace.chat")}
          </Text>
          {listingTitle ? (
            <Text style={styles.headerSub} numberOfLines={1}>
              {listingTitle}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel={t("marketplace.chatHide")}
        >
          <Text style={styles.closeText}>{t("marketplace.chatHide")}</Text>
        </Pressable>
      </View>

      <View style={styles.metaRow}>
        {updatedAt != null ? (
          <Text style={styles.updated}>{formatChatUpdatedLabel(updatedAt, nowTick, t)}</Text>
        ) : (
          <View />
        )}
        {pollError ? (
          <Pressable
            style={styles.errorChip}
            onPress={onRetryPoll}
            accessibilityRole="button"
            accessibilityLabel={t("marketplace.chatPollErrorA11y")}
          >
            <Text style={styles.errorChipText}>{t("marketplace.chatPollError")}</Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        data={thread}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.thread, thread.length === 0 ? styles.threadEmpty : null]}
        style={styles.threadList}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>{t("marketplace.chatEmpty")}</Text>
          </View>
        }
        keyboardShouldPersistTaps="handled"
      />

      <View style={[styles.composer, { borderTopColor: colors.border }]}>
        <TextInput
          style={styles.input}
          placeholder={t("marketplace.chatPlaceholder")}
          placeholderTextColor={colors.textPlaceholder}
          value={body}
          onChangeText={onChangeBody}
          editable={!sending}
          maxLength={500}
          accessibilityLabel={t("marketplace.chatInputA11y")}
          onSubmitEditing={onSend}
          returnKeyType="send"
        />
        <Pressable
          style={[styles.sendBtn, sending || !body.trim() ? styles.sendBtnDisabled : null]}
          onPress={onSend}
          disabled={sending || !body.trim()}
          accessibilityRole="button"
          accessibilityLabel={t("marketplace.chatSendA11y")}
        >
          <Text style={styles.sendText}>{t("marketplace.chatSend")}</Text>
        </Pressable>
      </View>
    </View>
  );

  if (isScreen) {
    if (!visible) return null;
    return <View style={styles.screenRoot}>{panel}</View>;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={styles.dismissHit}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
        />
        {panel}
      </View>
    </Modal>
  );
}

function buildChatPanelStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screenRoot: { flex: 1, backgroundColor: colors.bgPage },
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    dismissHit: { flex: 1 },
    sheet: {
      maxHeight: "78%",
      minHeight: "52%",
      backgroundColor: colors.bgPage,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      overflow: "hidden",
    },
    screenSheet: {
      flex: 1,
      backgroundColor: colors.bgPage,
      overflow: "hidden",
    },
    handle: {
      alignSelf: "center",
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.borderSoft,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
      gap: spacing.md,
    },
    headerTextWrap: { flex: 1, gap: 2 },
    headerTitle: {
      ...font("bodySemiBold"),
      fontSize: typography.bodyLg,
      color: colors.textPrimary,
    },
    headerSub: { fontSize: typography.caption, color: colors.textMuted },
    closeBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
    closeText: { color: colors.brand, fontWeight: "700", fontSize: typography.caption },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.xs,
      minHeight: 22,
    },
    updated: { color: colors.textMuted, fontSize: typography.micro, opacity: 0.9 },
    errorChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.pill,
      backgroundColor: colors.bgCard,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSoft,
    },
    errorChipText: { color: colors.textMuted, fontSize: typography.micro, fontWeight: "600" },
    threadList: { flexGrow: 1, flexShrink: 1 },
    thread: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
    threadEmpty: { flexGrow: 1, justifyContent: "center" },
    emptyWrap: { alignItems: "center", paddingVertical: spacing.xxl },
    emptyTitle: {
      ...font("body"),
      fontSize: typography.body,
      color: colors.textMuted,
      textAlign: "center",
    },
    row: { maxWidth: "86%", gap: 2 },
    rowMine: { alignSelf: "flex-end", alignItems: "flex-end" },
    rowOther: { alignSelf: "flex-start", alignItems: "flex-start" },
    nick: { fontSize: typography.micro, color: colors.textMuted, marginBottom: 2, marginLeft: 4 },
    bubble: {
      borderRadius: 16,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      maxWidth: "100%",
    },
    bubbleMine: {
      backgroundColor: colors.brand,
      borderBottomRightRadius: 4,
    },
    bubbleOther: {
      backgroundColor: colors.bgCard,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderBottomLeftRadius: 4,
    },
    bubbleText: {
      ...font("body"),
      fontSize: typography.body,
      color: colors.textPrimary,
      lineHeight: 20,
    },
    bubbleTextMine: { color: colors.textOnBrand },
    time: { fontSize: 10, color: colors.textMuted, marginTop: 2, marginLeft: 4 },
    timeMine: { marginRight: 4, marginLeft: 0 },
    composer: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      backgroundColor: colors.bgCard,
    },
    input: {
      flex: 1,
      backgroundColor: colors.bgSoft,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: typography.body,
      color: colors.textPrimary,
      maxHeight: 96,
    },
    sendBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm + 2,
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
    },
    sendBtnDisabled: { opacity: 0.45 },
    sendText: { color: colors.textOnBrand, fontWeight: "800", fontSize: typography.caption },
  });
}
