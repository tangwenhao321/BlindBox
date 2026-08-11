import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { parseError } from "../api";
import { getNewcomerOfferBox } from "../services/boxService";
import {
  claimNewcomerMission,
  fetchNewcomerMissions,
  type NewcomerMission,
} from "../services/newcomerMissionService";
import { toast } from "../utils/toast";
import { RemoteImage } from "./ui/RemoteImage";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { ListSkeleton } from "./ListSkeleton";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useAppTheme } from "../context/ThemeContext";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { resolveBoxImageUrl } from "../utils/boxImage";
import { formatCurrency } from "../utils/formatCurrency";
import { getNewcomerFallbackPrice } from "../utils/newcomerOffer";
import type { MysteryBox } from "../types";
import { trackEvent } from "../utils/analytics";

type Props = {
  visible: boolean;
  token: string;
  onClose: () => void;
  onBuyNow: (box: MysteryBox) => void;
};

export function NewcomerOfferModal({ visible, token, onClose, onBuyNow }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildNewcomerOfferStyles);
  const [box, setBox] = useState<MysteryBox | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [emptyOffer, setEmptyOffer] = useState(false);
  const [missions, setMissions] = useState<NewcomerMission[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const loadMissions = useCallback(async () => {
    if (!token) return;
    try {
      const rows = await fetchNewcomerMissions(token);
      setMissions(rows);
    } catch {
      setMissions([]);
    }
  }, [token]);

  const reload = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    setEmptyOffer(false);
    try {
      const [next] = await Promise.all([getNewcomerOfferBox(token), loadMissions()]);
      setBox(next);
      if (!next) {
        setEmptyOffer(true);
        setLoadError(t("newcomerOffer.emptyOffer"));
      }
    } catch (e) {
      setBox(null);
      setLoadError(parseError(e));
    } finally {
      setLoading(false);
    }
  }, [token, t, loadMissions]);

  useEffect(() => {
    if (!visible || !token) return;
    void reload();
  }, [visible, token, reload]);

  const priceText = useMemo(() => {
    if (!box) return formatCurrency(getNewcomerFallbackPrice());
    return formatCurrency(box.price);
  }, [box]);

  const topProduct = box?.products?.[0];
  const maxPrice = formatCurrency(topProduct?.price ?? 29999);
  const unavailable = !loading && !box;

  const missionsDone = missions.filter((m) => m.claimed).length;

  const onClaimMission = async (mission: NewcomerMission) => {
    if (!mission.id || !mission.completed || mission.claimed || !mission.unlocked) return;
    setClaimingId(mission.id);
    try {
      await claimNewcomerMission(token, mission.id);
      trackEvent("newcomer_mission_claim", { missionKey: mission.missionKey, dayIndex: mission.dayIndex });
      toast.success(t("newcomerOffer.missionsClaimed"));
      await loadMissions();
    } catch (e) {
      toast.error(parseError(e));
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.mask}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{t("newcomerOffer.tag")}</Text>
          </View>
          <Text style={styles.title}>
            <Text style={styles.titleBrand}>{t("newcomerOffer.titleNewcomer")}</Text>
            <Text style={styles.titleBrand}>{t("newcomerOffer.titleBox", { price: priceText })}</Text>
          </Text>
          <Text style={styles.subtitle}>
            {box?.name ? t("newcomerOffer.subtitlePrefix", { boxName: box.name }) : null}
            {t("newcomerOffer.subtitleBody", { maxPrice })}
          </Text>

          {loading ? (
            <View style={styles.heroSkeleton}>
              <ListSkeleton rows={1} />
            </View>
          ) : (
            <View style={styles.hero}>
              {box?.cover ? (
                <RemoteImage uri={resolveBoxImageUrl(box)} style={styles.heroImage} />
              ) : (
                <Text style={styles.heroMarker}>✦</Text>
              )}
              {box ? (
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>{t("newcomerOffer.badge")}</Text>
                </View>
              ) : null}
            </View>
          )}

          <View style={styles.pill}>
            <Text style={styles.pillText}>{t("newcomerOffer.pill", { price: priceText })}</Text>
          </View>
          <Text style={styles.guarantee}>{box?.tips || t("newcomerOffer.guaranteeDefault")}</Text>
          {loadError ? (
            <ListErrorBanner message={loadError} onRetry={emptyOffer ? undefined : () => void reload()} />
          ) : null}

          {missions.length ? (
            <View style={styles.missionsBlock}>
              <Text style={styles.missionsTitle}>
                {t("newcomerOffer.missionsTitle", { done: missionsDone, total: missions.length })}
              </Text>
              {missions.map((mission) => (
                <View key={mission.id ?? mission.missionKey} style={styles.missionRow}>
                  <View style={styles.missionMeta}>
                    <Text style={styles.missionName}>
                      {t("newcomerOffer.missionsDay", { day: mission.dayIndex })} · {mission.title}
                    </Text>
                    <Text style={styles.missionProgress}>
                      {mission.progress}/{mission.target}
                      {mission.rewardCoins ? ` · +${mission.rewardCoins}` : ""}
                      {mission.rewardHintCards ? ` · +${mission.rewardHintCards}` : ""}
                      {mission.rewardHintCards ? (
                        <Ionicons name="bulb-outline" size={12} color={colors.brand} />
                      ) : null}
                    </Text>
                  </View>
                  {mission.claimed ? (
                    <Text style={styles.missionClaimed}>{t("newcomerOffer.missionsClaimedBadge")}</Text>
                  ) : mission.completed && mission.unlocked && mission.id ? (
                    <Pressable
                      style={styles.missionClaimBtn}
                      disabled={claimingId === mission.id}
                      onPress={() => void onClaimMission(mission)}
                      accessibilityRole="button"
                      accessibilityLabel={t("newcomerOffer.missionsClaim")}
                    >
                      <Text style={styles.missionClaimText}>{t("newcomerOffer.missionsClaim")}</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.missionLocked}>
                      {!mission.unlocked ? t("newcomerOffer.missionsLocked") : t("newcomerOffer.missionsInProgress")}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          ) : null}

          {loading && !box ? <ListSkeleton variant="card" rows={1} /> : null}
          <Pressable
            style={[styles.cta, loading || unavailable ? styles.ctaDisabled : null]}
            disabled={loading || unavailable}
            accessibilityRole="button"
            accessibilityLabel={t("newcomerOffer.ctaA11y")}
            onPress={() => box && onBuyNow(box)}
          >
            <Text style={styles.ctaText}>
              {loading ? t("newcomerOffer.ctaLoading") : box ? t("newcomerOffer.ctaBuy") : t("newcomerOffer.ctaUnavailable")}
            </Text>
          </Pressable>
        </View>
        <Pressable style={styles.closeOuter} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("newcomerOffer.closeA11y")}>
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function buildNewcomerOfferStyles(colors: ThemeColors) {
  return StyleSheet.create({
    mask: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.lg,
    },
    scroll: { flexGrow: 1, justifyContent: "center", alignItems: "center", width: "100%" },
    card: {
      width: "100%",
      maxWidth: 360,
      backgroundColor: colors.bgCard,
      borderRadius: radius.xl,
      padding: spacing.lg,
      maxHeight: "82%",
    },
    tag: {
      alignSelf: "flex-start",
      backgroundColor: colors.danger,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      marginBottom: spacing.sm,
    },
    tagText: { color: colors.textOnBrand, fontSize: typography.micro, fontWeight: "800" },
    title: { fontSize: typography.h2, fontWeight: "900", marginBottom: spacing.xs },
    titleBrand: { color: colors.brandText },
    subtitle: { fontSize: typography.caption, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.md },
    priceHighlight: { color: colors.danger, fontWeight: "800" },
    hero: {
      height: 120,
      borderRadius: radius.lg,
      backgroundColor: colors.warningSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.md,
      overflow: "hidden",
    },
    heroSkeleton: {
      height: 120,
      marginBottom: spacing.md,
      overflow: "hidden",
    },
    heroImage: { width: "100%", height: "100%" },
    heroMarker: { fontSize: 48, color: colors.brandText, fontWeight: "900" },
    heroBadge: {
      position: "absolute",
      right: spacing.md,
      bottom: spacing.md,
      backgroundColor: colors.accentOrange,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
    },
    heroBadgeText: { color: colors.textOnBrand, fontSize: typography.micro, fontWeight: "800" },
    pill: {
      alignSelf: "center",
      backgroundColor: colors.accentOrange,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xs,
      marginBottom: spacing.sm,
    },
    pillText: { color: colors.textOnBrand, fontWeight: "800", fontSize: typography.caption },
    guarantee: {
      textAlign: "center",
      color: colors.textSecondary,
      fontSize: typography.caption,
      marginBottom: spacing.md,
    },
    cta: {
      borderRadius: radius.pill,
      paddingVertical: spacing.md,
      alignItems: "center",
      backgroundColor: colors.accentOrange,
    },
    ctaDisabled: { opacity: 0.6 },
    ctaText: { color: colors.textOnBrand, fontSize: typography.h4, fontWeight: "900" },
    closeOuter: {
      marginTop: spacing.lg,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.bgCard,
      alignItems: "center",
      justifyContent: "center",
    },
    closeIcon: { fontSize: 18, color: colors.textMuted, fontWeight: "700" },
    missionsBlock: { marginBottom: spacing.md, gap: spacing.sm },
    missionsTitle: { fontWeight: "800", fontSize: typography.body, color: colors.textPrimary },
    missionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    missionMeta: { flex: 1 },
    missionName: { fontWeight: "700", fontSize: typography.caption, color: colors.textPrimary },
    missionProgress: { fontSize: typography.micro, color: colors.textSecondary, marginTop: 2 },
    missionClaimBtn: {
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
    },
    missionClaimText: { color: colors.textOnBrand, fontWeight: "800", fontSize: typography.micro },
    missionClaimed: { color: colors.textMuted, fontSize: typography.micro, fontWeight: "700" },
    missionLocked: { color: colors.textMuted, fontSize: typography.micro },
  });
}
