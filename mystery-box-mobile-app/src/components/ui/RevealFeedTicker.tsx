import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useDrawFeedSse } from "../../hooks/useDrawFeedSse";
import type { DrawFeedItem } from "../../services/drawFeedService";
import { getRevealRemoteConfig } from "../../effects/revealRemote";
import { isRevealMinorModeActive } from "../../effects/revealMinorMode";
import { resolveRecordingSafeRevealFlags } from "../../effects/revealRecordingMode";
import { getRevealFeedTickerEnabled, getRevealFeedOptOut } from "../../utils/revealSettings";
import { normalizeQualityTier, qualityLabel } from "../../utils/quality";

const BASE_HIDE_MS = 4200;

function isFeedItemFresh(item: DrawFeedItem): boolean {
  const ttl = getRevealRemoteConfig().feedTickerTtlMs ?? BASE_HIDE_MS * 3;
  const createdAt = item.createdTime ? Date.parse(item.createdTime) : NaN;
  if (!Number.isFinite(createdAt)) return true;
  return Date.now() - createdAt <= ttl;
}

function passesNicknameBlocklist(nickname?: string): boolean {
  const blocklist = getRevealRemoteConfig().feedTickerBlocklist ?? [];
  if (!blocklist.length || !nickname) return true;
  const lower = nickname.toLowerCase();
  return !blocklist.some((term) => lower.includes(term.toLowerCase()));
}

function passesFeedTickerFilter(qualityType?: string): boolean {
  const minTier = getRevealRemoteConfig().feedTickerMinTier;
  const tier = normalizeQualityTier(qualityType);
  if (minTier === "LEGENDARY") {
    return tier === "LEGENDARY" || tier === "HIDDEN";
  }
  return tier !== "GENERAL";
}

function isFeedTickerPeakHour(): boolean {
  const hour = new Date().getHours();
  return hour >= 18 && hour <= 23;
}

function resolveTickerHideMs(): number {
  const remote = getRevealRemoteConfig();
  const base = remote.feedTickerTtlMs ? Math.min(BASE_HIDE_MS, remote.feedTickerTtlMs) : BASE_HIDE_MS;
  if (!isFeedTickerPeakHour()) return base;
  return Math.round(base * remote.feedTickerPeakMultiplier);
}

type Props = {
  visible: boolean;
  boxId?: string | null;
};

function maskName(name?: string) {
  const raw = (name ?? "").trim();
  if (raw.length <= 1) return raw || "***";
  if (raw.length === 2) return `${raw[0]}*`;
  return `${raw[0]}**${raw.slice(-1)}`;
}

export function RevealFeedTicker({ visible, boxId }: Props) {
  const { t } = useTranslation();
  const [item, setItem] = useState<DrawFeedItem | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(-12)).current;
  const remoteEnabled = getRevealRemoteConfig().feedTickerEnabled;
  const tapEnabled = getRevealRemoteConfig().feedTickerTapEnabled;
  const recordingFlags = resolveRecordingSafeRevealFlags();
  const [userTicker, setUserTicker] = useState<boolean | null>(null);
  const [feedOptOut, setFeedOptOut] = useState(false);
  useEffect(() => {
    void getRevealFeedTickerEnabled().then(setUserTicker);
    void getRevealFeedOptOut().then(setFeedOptOut);
  }, []);
  const enabled =
    visible &&
    remoteEnabled &&
    !feedOptOut &&
    !recordingFlags.hideTicker &&
    !isRevealMinorModeActive() &&
    (userTicker ?? true);
  const hideMs = useMemo(() => resolveTickerHideMs(), [item]);

  useDrawFeedSse(boxId ?? null, enabled, (items) => {
    const next = items.find(
      (row) =>
        isFeedItemFresh(row) &&
        passesFeedTickerFilter(row.qualityType) &&
        passesNicknameBlocklist(row.displayName),
    );
    if (!next) return;
    setItem(next);
  });

  useEffect(() => {
    if (!enabled || !item) {
      opacity.setValue(0);
      return;
    }
    opacity.setValue(0);
    slideY.setValue(-12);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    const hide = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }).start();
    }, hideMs);
    return () => clearTimeout(hide);
  }, [enabled, item, opacity, slideY, hideMs]);

  if (!enabled || !item) return null;

  const tier = normalizeQualityTier(item.qualityType);
  const tierLabel = qualityLabel(tier, t);
  const rawTier = (item.qualityType ?? "").toUpperCase();
  const isTopLine = rawTier.includes("PEERLESS") || rawTier.includes("TREASURE");

  return (
    <>
      <Animated.View
        style={[styles.host, { opacity, transform: [{ translateY: slideY }] }]}
        pointerEvents={tapEnabled ? "box-none" : "none"}
      >
        <Pressable
          style={styles.chip}
          disabled={!tapEnabled}
          onPress={() => setDetailVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t("revealOverlay.feedTickerDetailA11y")}
        >
          <Text style={[styles.text, styles.textTop]} numberOfLines={1}>
            {isTopLine
              ? t("revealOverlay.feedTickerTop", { user: maskName(item.displayName), tier: tierLabel })
              : t("revealOverlay.feedTicker", {
                  user: maskName(item.displayName),
                  tier: tierLabel,
                  product: item.productName ?? t("revealOverlay.feedTickerPrize"),
                })}
          </Text>
          {!isTopLine ? (
            <Text style={[styles.text, styles.textBottom]} numberOfLines={1}>
              {t("revealOverlay.feedTickerBottom", {
                product: item.productName ?? t("revealOverlay.feedTickerPrize"),
              })}
            </Text>
          ) : null}
        </Pressable>
      </Animated.View>
      <Modal visible={detailVisible} transparent animationType="slide" onRequestClose={() => setDetailVisible(false)}>
        <Pressable
          style={styles.sheetMask}
          onPress={() => setDetailVisible(false)}
          accessibilityLabel={t("revealOverlay.feedTickerDetailCloseA11y")}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t("revealOverlay.feedTickerDetailTitle")}</Text>
            <Text style={styles.sheetRow}>
              {t("revealOverlay.feedTickerDetailUser", { user: maskName(item.displayName) })}
            </Text>
            <Text style={styles.sheetRow}>{t("revealOverlay.feedTickerDetailTier", { tier: tierLabel })}</Text>
            <Text style={styles.sheetRow}>
              {t("revealOverlay.feedTickerDetailProduct", {
                product: item.productName ?? t("revealOverlay.feedTickerPrize"),
              })}
            </Text>
            <Pressable style={styles.sheetCloseBtn} onPress={() => setDetailVisible(false)} accessibilityRole="button">
              <Text style={styles.sheetCloseText}>{t("revealOverlay.feedTickerDetailClose")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: 56,
    left: 16,
    right: 16,
    zIndex: 2200,
    alignItems: "center",
    paddingVertical: 8,
  },
  chip: {
    maxWidth: "100%",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(10, 10, 20, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
  },
  text: {
    color: "rgba(255, 255, 255, 0.92)",
    fontSize: 12,
    fontWeight: "700",
  },
  textTop: { fontSize: 13 },
  textBottom: { marginTop: 2, fontSize: 11, fontWeight: "600", opacity: 0.85 },
  sheetMask: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#1a1a2e",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 8,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginBottom: 8,
  },
  sheetTitle: { color: "#fff", fontWeight: "900", fontSize: 17, marginBottom: 4 },
  sheetRow: { color: "rgba(255,255,255,0.9)", fontSize: 14, fontWeight: "600" },
  sheetCloseBtn: {
    marginTop: 12,
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  sheetCloseText: { color: "#fff", fontWeight: "800" },
});
