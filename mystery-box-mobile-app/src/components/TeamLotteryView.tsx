import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SubPageHeader } from "./ui/SubPageHeader";
import { EmptyState } from "./EmptyState";
import { OptimizedFlatList } from "./ui/OptimizedFlatList";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { listEmptyWhenOk, shouldShowListSkeleton } from "./ui/listScreenHelpers";
import { ListSkeleton } from "./ListSkeleton";
import { useAuthToken } from "../hooks/useAuthToken";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useAppTheme } from "../context/ThemeContext";
import { parseError, toAppError } from "../api";
import { reportAppError } from "../utils/crashReport";
import { toast } from "../utils/toast";
import { layout, radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import {
  createTeamLottery,
  drawTeamLottery,
  fetchMyTeamLotteries,
  fetchTeamLotteryChat,
  fetchTeamLotteryMembers,
  joinTeamLottery,
  lockTeamLottery,
  postTeamLotteryChat,
  type TeamLottery,
  type TeamLotteryChat,
  type TeamLotteryMember,
} from "../services/teamLotteryService";
import { getBoxById, queryBoxes } from "../services/boxService";
import {
  createOrder,
  getOrderById,
  getVNPayPrepayParams,
  getWechatPrepayParams,
  mockPayOrder,
} from "../services/orderService";
import { DEFAULT_QUERY_PAGE_SIZE, MOCK_PAYMENT_ENABLED } from "../config/constants";
import { resolvePaymentMode } from "../config/payment";
import { isUnpaidOrder } from "../order-utils";
import { invokeWechatPay } from "../utils/wechatPay";
import type { MysteryBox, Order } from "../types";

type Props = {
  onBack: () => void;
  onRequireLogin?: () => void;
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Poll until order leaves TO_BE_PAID (payment notify applied prizes). */
async function waitUntilOrderPaid(authToken: string, orderId: string, attempts = 24, delayMs = 1500): Promise<Order | null> {
  for (let i = 0; i < attempts; i++) {
    const order = await getOrderById(authToken, orderId);
    if (!isUnpaidOrder(order)) {
      return order;
    }
    await sleep(delayMs);
  }
  return null;
}

export function TeamLotteryView({ onBack, onRequireLogin }: Props) {
  const authToken = useAuthToken();
  const { t } = useTranslation();
  const { colors: themeColors } = useAppTheme();
  const styles = useThemedStyles(buildStyles);
  const [teams, setTeams] = useState<TeamLottery[]>([]);
  const [active, setActive] = useState<TeamLottery | null>(null);
  const [members, setMembers] = useState<TeamLotteryMember[]>([]);
  const [chat, setChat] = useState<TeamLotteryChat[]>([]);
  const [boxId, setBoxId] = useState("");
  const [boxName, setBoxName] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerBoxes, setPickerBoxes] = useState<MysteryBox[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [chatBody, setChatBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const id = boxId.trim();
    if (!id || !authToken) {
      setBoxName(null);
      return;
    }
    let cancelled = false;
    void getBoxById(authToken, id)
      .then((box) => {
        if (!cancelled) setBoxName(box?.name ?? null);
      })
      .catch(() => {
        if (!cancelled) setBoxName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [boxId, authToken]);

  const openBoxPicker = useCallback(async () => {
    if (!authToken) {
      onRequireLogin?.();
      return;
    }
    setPickerVisible(true);
    setPickerLoading(true);
    try {
      const { items } = await queryBoxes(authToken, DEFAULT_QUERY_PAGE_SIZE, 1);
      setPickerBoxes(items);
    } catch (error) {
      toast.error(parseError(error));
      setPickerBoxes([]);
    } finally {
      setPickerLoading(false);
    }
  }, [authToken, onRequireLogin]);

  const loadMembers = useCallback(
    async (teamId: string) => {
      if (!authToken) {
        setMembers([]);
        return;
      }
      try {
        const list = await fetchTeamLotteryMembers(authToken, teamId);
        setMembers(list);
      } catch {
        setMembers([]);
      }
    },
    [authToken],
  );

  const reload = useCallback(async () => {
    if (!authToken) {
      setTeams([]);
      setLoading(false);
      return;
    }
    setLoadError(null);
    try {
      const list = await fetchMyTeamLotteries(authToken);
      setTeams(list);
      if (active) {
        const next = list.find((x) => x.id === active.id) ?? list[0] ?? null;
        setActive(next);
        if (next) {
          setChat(await fetchTeamLotteryChat(authToken, next.id));
          setMembers(next.members ?? (await fetchTeamLotteryMembers(authToken, next.id).catch(() => [])));
        } else {
          setChat([]);
          setMembers([]);
        }
      }
    } catch (error) {
      setLoadError(parseError(error));
      reportAppError(toAppError(error), "team_lottery_load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authToken, active]);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load
  }, [authToken]);

  const requireAuth = () => {
    if (!authToken) {
      onRequireLogin?.();
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!requireAuth() || !authToken) return;
    if (!boxId.trim()) {
      toast.error(t("teamLottery.boxIdRequired"));
      return;
    }
    try {
      const team = await createTeamLottery(authToken, { boxId: boxId.trim() });
      toast.success(t("teamLottery.createSuccess"));
      toast.info(t("teamLottery.summonToast"));
      setActive(team);
      setMembers(team.members ?? []);
      setBoxId("");
      setBoxName(null);
      void reload();
    } catch (error) {
      reportAppError(toAppError(error), "team_lottery_create");
      toast.error(parseError(error));
    }
  };

  const handleJoin = async () => {
    if (!requireAuth() || !authToken) return;
    if (!inviteCode.trim()) {
      toast.error(t("teamLottery.inviteRequired"));
      return;
    }
    try {
      const team = await joinTeamLottery(authToken, { inviteCode: inviteCode.trim() });
      toast.success(t("teamLottery.joinSuccess"));
      toast.info(t("teamLottery.responseToast"));
      setActive(team);
      setMembers(team.members ?? []);
      setInviteCode("");
      void reload();
    } catch (error) {
      reportAppError(toAppError(error), "team_lottery_join");
      toast.error(parseError(error));
    }
  };

  const handleLock = async () => {
    if (!authToken || !active) return;
    try {
      const team = await lockTeamLottery(authToken, active.id);
      setActive(team);
      toast.success(t("teamLottery.lockSuccess"));
      void reload();
    } catch (error) {
      toast.error(parseError(error));
    }
  };

  const payTeamOrder = async (orderId: string): Promise<Order | null> => {
    if (!authToken) return null;
    const mode = resolvePaymentMode();
    if (MOCK_PAYMENT_ENABLED || mode === "mock") {
      await mockPayOrder(authToken, orderId);
      return getOrderById(authToken, orderId);
    }
    if (mode === "vnpay") {
      toast.info(t("teamLottery.completePayment"));
      const prepay = await getVNPayPrepayParams(authToken, orderId);
      if (!prepay?.paymentUrl) {
        throw new Error(t("teamLottery.paymentRequired"));
      }
      await Linking.openURL(prepay.paymentUrl);
      return waitUntilOrderPaid(authToken, orderId);
    }
    toast.info(t("teamLottery.completePayment"));
    const prepay = await getWechatPrepayParams(authToken, orderId);
    const paidNative = await invokeWechatPay(prepay);
    if (!paidNative) {
      return null;
    }
    return waitUntilOrderPaid(authToken, orderId, 12, 1000);
  };

  const handleDraw = async () => {
    if (!authToken || !active || drawing) return;
    setDrawing(true);
    try {
      const orderId = await createOrder(authToken, active.boxId, undefined, 1);
      const paidOrder = await payTeamOrder(orderId);
      if (!paidOrder || isUnpaidOrder(paidOrder)) {
        toast.error(t("teamLottery.paymentRequired"));
        return;
      }
      const products = (paidOrder.items ?? []).flatMap((item) => item.products ?? []);
      const resultJson = JSON.stringify({
        orderId,
        products: products.map((p) => ({ id: p.id, name: p.name, qualityType: p.qualityType })),
      });
      // Pass only orderId (+ optional resultJson). Server ignores client hitHidden.
      const drawResult = await drawTeamLottery(authToken, active.id, { orderId, resultJson });
      toast.success(t("teamLottery.drawSuccess"));
      if (drawResult.grantedBoost) {
        toast.info(t("teamLottery.hiddenBoost"));
      }
      void reload();
    } catch (error) {
      reportAppError(toAppError(error), "team_lottery_draw");
      toast.error(parseError(error));
    } finally {
      setDrawing(false);
    }
  };

  const handleSendChat = async () => {
    if (!authToken || !active || !chatBody.trim()) return;
    try {
      await postTeamLotteryChat(authToken, active.id, chatBody.trim());
      setChatBody("");
      setChat(await fetchTeamLotteryChat(authToken, active.id));
    } catch (error) {
      toast.error(parseError(error));
    }
  };

  return (
    <View style={styles.page}>
      <SubPageHeader title={t("teamLottery.title")} onBack={onBack} />
      <View style={styles.formCol}>
        <View style={styles.formRow}>
          <Pressable
            style={[styles.input, styles.boxPickerField]}
            onPress={() => void openBoxPicker()}
            accessibilityRole="button"
            accessibilityLabel={t("teamLottery.selectBox")}
          >
            <Text style={boxId ? styles.boxPickerValue : styles.boxPickerPlaceholder} numberOfLines={1}>
              {boxName ? boxName : boxId.trim() ? boxId.trim() : t("teamLottery.selectBoxPlaceholder")}
            </Text>
          </Pressable>
          <Pressable
            style={styles.btnSecondary}
            onPress={() => void openBoxPicker()}
            accessibilityRole="button"
            accessibilityLabel={t("teamLottery.selectBox")}
          >
            <Text style={styles.btnSecondaryText}>{t("teamLottery.selectBox")}</Text>
          </Pressable>
          <Pressable
            style={styles.btn}
            onPress={() => void handleCreate()}
            accessibilityRole="button"
            accessibilityLabel={t("teamLottery.create")}
          >
            <Text style={styles.btnText}>{t("teamLottery.create")}</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.formRow}>
        <TextInput
          style={styles.input}
          placeholder={t("teamLottery.invitePlaceholder")}
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
        />
        <Pressable
          style={styles.btnSecondary}
          onPress={() => void handleJoin()}
          accessibilityRole="button"
          accessibilityLabel={t("teamLottery.join")}
        >
          <Text style={styles.btnSecondaryText}>{t("teamLottery.join")}</Text>
        </Pressable>
      </View>
      {loadError ? <ListErrorBanner message={loadError} onRetry={() => void reload()} /> : null}
      {shouldShowListSkeleton(loading, teams.length, loadError, refreshing) ? (
        <ListSkeleton variant="row" rows={4} />
      ) : (
        <OptimizedFlatList
          listVariant="row"
          data={teams}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void reload();
              }}
              tintColor={themeColors.brand}
            />
          }
          ListEmptyComponent={listEmptyWhenOk(
            loadError,
            <EmptyState title={t("teamLottery.empty")} description={t("teamLottery.emptyDesc")} variant="plain" />,
          )}
          ListHeaderComponent={
            active ? (
              <View style={styles.activeCard}>
                <Text style={styles.activeTitle}>{t("teamLottery.activeTeam")}</Text>
                <Text style={styles.meta}>
                  {t("teamLottery.inviteCode")}: {active.inviteCode}
                </Text>
                <Text style={styles.meta}>
                  {t("teamLottery.members")}: {active.memberCount}/5 · {t("teamLottery.remainingDraws")}:{" "}
                  {active.remainingDraws}
                </Text>
                <Text style={styles.meta}>
                  {t("teamLottery.status")}: {active.status}
                </Text>
                {members.length > 0 ? (
                  <Text style={styles.meta}>
                    {members.map((m) => m.userId.slice(0, 8)).join(" · ")}
                  </Text>
                ) : null}
                <View style={styles.actionRow}>
                  {active.status === "OPEN" ? (
                    <Pressable
                      style={styles.btn}
                      onPress={() => void handleLock()}
                      accessibilityRole="button"
                      accessibilityLabel={t("teamLottery.lock")}
                    >
                      <Text style={styles.btnText}>{t("teamLottery.lock")}</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={[styles.btn, drawing ? styles.btnDisabled : null]}
                    onPress={() => void handleDraw()}
                    disabled={drawing}
                    accessibilityRole="button"
                    accessibilityLabel={drawing ? t("teamLottery.drawing") : t("teamLottery.draw")}
                  >
                    <Text style={styles.btnText}>{drawing ? t("teamLottery.drawing") : t("teamLottery.draw")}</Text>
                  </Pressable>
                </View>
                <Text style={[styles.activeTitle, { marginTop: spacing.md }]}>{t("teamLottery.chat")}</Text>
                {chat.slice(0, 8).map((msg) => (
                  <Text key={msg.id} style={styles.chatLine}>
                    [{msg.msgType}] {msg.body}
                  </Text>
                ))}
                <View style={styles.formRow}>
                  <TextInput
                    style={styles.input}
                    placeholder={t("teamLottery.chatPlaceholder")}
                    value={chatBody}
                    onChangeText={setChatBody}
                  />
                  <Pressable
                    style={styles.btnSecondary}
                    onPress={() => void handleSendChat()}
                    accessibilityRole="button"
                    accessibilityLabel={t("teamLottery.send")}
                  >
                    <Text style={styles.btnSecondaryText}>{t("teamLottery.send")}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, active?.id === item.id ? styles.cardOn : null]}
              onPress={() => {
                setActive(item);
                setMembers(item.members ?? []);
                if (authToken) {
                  void fetchTeamLotteryChat(authToken, item.id).then(setChat).catch(() => setChat([]));
                  void loadMembers(item.id);
                }
              }}
            >
              <Text style={styles.name}>
                {item.inviteCode} · {item.status}
              </Text>
              <Text style={styles.meta}>
                {t("teamLottery.members")}: {item.memberCount} · {t("teamLottery.remainingDraws")}:{" "}
                {item.remainingDraws}
              </Text>
            </Pressable>
          )}
        />
      )}

      <Modal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("teamLottery.selectBox")}</Text>
              <Pressable onPress={() => setPickerVisible(false)} accessibilityRole="button">
                <Text style={styles.modalClose}>{t("teamLottery.closePicker")}</Text>
              </Pressable>
            </View>
            {pickerLoading ? (
              <ActivityIndicator color={themeColors.brand} style={{ marginVertical: spacing.xl }} />
            ) : (
              <OptimizedFlatList
                listVariant="row"
                data={pickerBoxes}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={<Text style={styles.meta}>{t("teamLottery.pickerEmpty")}</Text>}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.pickerRow}
                    onPress={() => {
                      setBoxId(item.id);
                      setBoxName(item.name);
                      setPickerVisible(false);
                    }}
                  >
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {item.id}
                    </Text>
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.bgPage },
    formCol: { marginBottom: 0 },
    formRow: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: layout.screenPaddingX,
      marginBottom: spacing.sm,
      alignItems: "center",
    },
    input: {
      flex: 1,
      backgroundColor: colors.bgCard,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: typography.caption,
    },
    boxPickerField: { justifyContent: "center", minHeight: 40 },
    boxPickerPlaceholder: { color: colors.textMuted, fontSize: typography.caption },
    boxPickerValue: { color: colors.textPrimary, fontSize: typography.caption, fontWeight: "600" },
    btn: {
      backgroundColor: colors.brand,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    btnText: { color: colors.textOnBrand, fontWeight: "700", fontSize: typography.caption },
    btnDisabled: { opacity: 0.55 },
    btnSecondary: {
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgCard,
    },
    btnSecondaryText: { color: colors.textSecondary, fontWeight: "700", fontSize: typography.caption },
    list: { padding: layout.screenPaddingX, gap: spacing.md, paddingBottom: spacing.xxl },
    activeCard: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      gap: 4,
    },
    activeTitle: { fontWeight: "800", color: colors.textPrimary, fontSize: typography.body },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardOn: { borderColor: colors.brand },
    name: { fontWeight: "700", color: colors.textPrimary },
    meta: { color: colors.textSecondary, fontSize: typography.caption },
    actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
    chatLine: { color: colors.textMuted, fontSize: typography.caption, marginTop: 2 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      maxHeight: "70%",
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.md,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    modalTitle: { fontWeight: "800", fontSize: typography.body, color: colors.textPrimary },
    modalClose: { color: colors.brand, fontWeight: "700", fontSize: typography.caption },
    pickerRow: {
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: 2,
    },
  });
}
