import { useEffect, useRef, useState } from "react";
import { Clipboard, Modal, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import QRCode from "react-native-qrcode-svg";
import { formatOrderIdShort } from "../order-utils";
import { fetchDrawFeed } from "../services/drawFeedService";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { radius, spacing, typography, nightColors } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { buildInviteUrl } from "../utils/inviteUrl";
import { resolveSpectatorPosterLink } from "../utils/sharePosterSpectator";
import { shareViaZalo } from "../utils/shareZalo";
import { toast } from "../utils/toast";

/** Night Cabinet ink poster grounds (no indigo/slate-blue). */
const POSTER_INK = nightColors.bgPage;
const POSTER_INK_DEEP = "#0E0C0A";
const POSTER_INK_SOFT = nightColors.bgSoft;
const POSTER_INK_CARD = nightColors.bgCard;

function buildInviteQrValue(inviteCode: string | undefined, orderId: string) {
  if (inviteCode) {
    const invite = buildInviteUrl(inviteCode);
    return `${invite}${invite.includes("?") ? "&" : "?"}order=${encodeURIComponent(orderId)}`;
  }
  return `mysterybox://order/${encodeURIComponent(orderId)}`;
}

type PosterTemplate = "standard" | "tiktok" | "square" | "long";

type Props = {
  visible: boolean;
  boxName: string;
  orderId: string;
  drawCount: number;
  topPrizeName?: string;
  authToken?: string;
  spectatorShareToken?: string | null;
  boxId?: string;
  includeLatestFeed?: boolean;
  inviteCode?: string;
  zaloOaId?: string;
  enableSpectatorLink?: boolean;
  onClose: () => void;
};

export function SharePosterModal({
  visible,
  boxName,
  orderId,
  drawCount,
  topPrizeName,
  authToken,
  spectatorShareToken,
  boxId,
  includeLatestFeed,
  inviteCode,
  zaloOaId,
  enableSpectatorLink = true,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildSharePosterStyles);
  const posterRef = useRef<View>(null);
  const [template, setTemplate] = useState<PosterTemplate>("standard");
  const [spectatorQrValue, setSpectatorQrValue] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !authToken || !enableSpectatorLink) {
      setSpectatorQrValue(null);
      return;
    }
    let cancelled = false;
    void resolveSpectatorPosterLink({
      authToken,
      orderId,
      drawCount,
      topPrizeName,
      spectatorShareToken,
      boxId,
    }).then((url) => {
      if (!cancelled) setSpectatorQrValue(url);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, authToken, enableSpectatorLink, orderId, drawCount, topPrizeName, spectatorShareToken, boxId]);

  const buildMessage = async () => {
    let extra = "";
    if (includeLatestFeed && authToken) {
      const feed = await fetchDrawFeed(authToken, null, 1);
      if (feed[0]) {
        extra = t("sharePoster.feedExtra", { name: feed[0].displayName, product: feed[0].productName });
      }
    }
    let spectatorLine = "";
    if (authToken && enableSpectatorLink) {
      const url = await resolveSpectatorPosterLink({
        authToken,
        orderId,
        drawCount,
        topPrizeName,
        spectatorShareToken,
        boxId,
      });
      if (url) {
        spectatorLine = t("sharePoster.spectatorLink", { url });
      }
    }
    return t("sharePoster.message", {
      boxName,
      count: drawCount,
      prize: topPrizeName ? t("sharePoster.messagePrize", { name: topPrizeName }) : "",
      orderId: formatOrderIdShort(orderId),
      extra,
      spectator: spectatorLine,
    });
  };

  const shareImage = async () => {
    if (!posterRef.current) return;
    try {
      const uri = await captureRef(posterRef, { format: "png", quality: 0.95 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: t("sharePoster.dialogTitle") });
        onClose();
        return;
      }
    } catch {
      // fall through to text
    }
    const message = await buildMessage();
    await Share.share({ message });
    onClose();
  };

  const posterStyle =
    template === "tiktok"
      ? styles.posterTikTok
      : template === "square"
        ? styles.posterSquare
        : template === "long"
          ? styles.posterLong
          : styles.poster;
  const qrSize = template === "tiktok" || template === "long" ? 96 : template === "square" ? 80 : 88;
  const qrValue = spectatorQrValue ?? buildInviteQrValue(inviteCode, orderId);
  const qrHint = spectatorQrValue
    ? t("sharePoster.qrSpectator")
    : process.env.EXPO_PUBLIC_INVITE_BASE_URL?.trim()
      ? t("sharePoster.qrInvite")
      : t("sharePoster.qrApp");

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} accessibilityViewIsModal>
      <View style={styles.mask} accessibilityLabel={t("sharePoster.a11y")}>
        <View style={styles.card}>
          <Text style={styles.title}>{t("sharePoster.title")}</Text>
          <View style={styles.templateRow}>
            {(["standard", "tiktok", "square", "long"] as const).map((key) => (
              <Pressable
                key={key}
                style={[styles.templateChip, template === key ? styles.templateChipOn : null]}
                onPress={() => setTemplate(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: template === key }}
              >
                <Text style={[styles.templateChipText, template === key ? styles.templateChipTextOn : null]}>
                  {key === "standard"
                    ? t("sharePoster.templateStandard")
                    : key === "tiktok"
                      ? t("sharePoster.templateTikTok")
                      : key === "square"
                        ? t("sharePoster.templateSquare")
                        : t("sharePoster.templateLong")}
                </Text>
              </Pressable>
            ))}
          </View>
          <View ref={posterRef} collapsable={false} style={posterStyle} accessibilityLabel={t("sharePoster.posterA11y", { boxName })}>
            <Text style={styles.posterBrand}>{t("sharePoster.brand")}</Text>
            <Text
              style={[
                styles.posterBox,
                template === "tiktok" || template === "long" ? styles.posterBoxTikTok : null,
                template === "square" ? styles.posterBoxSquare : null,
              ]}
            >
              {boxName}
            </Text>
            {topPrizeName ? <Text style={styles.posterPrize}>{t("sharePoster.topPrize", { name: topPrizeName })}</Text> : null}
            <Text style={styles.posterMeta}>
              {t("sharePoster.meta", { count: drawCount, orderId: formatOrderIdShort(orderId) })}
            </Text>
            <View style={styles.qrWrap}>
              <QRCode value={qrValue} size={qrSize} />
              <Text style={styles.qrHint}>{qrHint}</Text>
            </View>
          </View>
          <Pressable style={styles.btn} onPress={() => void shareImage()} accessibilityRole="button" accessibilityLabel={t("sharePoster.shareImageA11y")}>
            <Text style={styles.btnText}>{t("sharePoster.shareImage")}</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnGhost]}
            onPress={async () => {
              const message = await buildMessage();
              const inviteLink = inviteCode ? buildInviteUrl(inviteCode) : undefined;
              await shareViaZalo(message, zaloOaId, inviteLink);
            }}
            accessibilityRole="button"
            accessibilityLabel={t("sharePoster.shareZaloA11y")}
          >
            <Text style={styles.btnGhostText}>{t("sharePoster.shareZalo")}</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnGhost]}
            onPress={async () => {
              const message = await buildMessage();
              Clipboard.setString(message);
              toast.success(t("sharePoster.copyDone"));
            }}
            accessibilityRole="button"
            accessibilityLabel={t("sharePoster.copyTextA11y")}
          >
            <Text style={styles.btnGhostText}>{t("sharePoster.copyText")}</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnGhost]}
            onPress={async () => {
              await Share.share({ message: await buildMessage() });
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel={t("sharePoster.shareTextA11y")}
          >
            <Text style={styles.btnGhostText}>{t("sharePoster.shareText")}</Text>
          </Pressable>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t("sharePoster.cancelA11y")}>
            <Text style={styles.cancel}>{t("sharePoster.cancel")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function buildSharePosterStyles(colors: ThemeColors) {
  return StyleSheet.create({
    mask: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: spacing.lg },
    card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg },
    title: { fontWeight: "900", fontSize: typography.h3, marginBottom: spacing.md, color: colors.textPrimary },
    templateRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
    templateChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
      backgroundColor: colors.bgSoft,
    },
    templateChipOn: { backgroundColor: colors.brand },
    templateChipText: { fontWeight: "700", color: colors.textSecondary, fontSize: typography.caption },
    templateChipTextOn: { color: colors.textOnBrand },
    poster: {
      backgroundColor: POSTER_INK_CARD,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    posterTikTok: {
      backgroundColor: POSTER_INK,
      borderRadius: radius.lg,
      padding: spacing.xl,
      marginBottom: spacing.lg,
      minHeight: 420,
      justifyContent: "space-between",
    },
    posterSquare: {
      backgroundColor: POSTER_INK_SOFT,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      aspectRatio: 1,
      justifyContent: "space-between",
    },
    posterLong: {
      backgroundColor: POSTER_INK_DEEP,
      borderRadius: radius.lg,
      padding: spacing.xl,
      marginBottom: spacing.lg,
      minHeight: 520,
      justifyContent: "space-between",
    },
    posterBrand: { color: nightColors.brand, fontWeight: "900", fontSize: typography.caption },
    posterBox: { color: nightColors.textPrimary, fontWeight: "900", fontSize: typography.h2, marginTop: spacing.sm },
    posterBoxTikTok: { fontSize: typography.h1, lineHeight: 36 },
    posterBoxSquare: { fontSize: typography.h3, lineHeight: 28 },
    posterPrize: { color: nightColors.brandText, fontWeight: "800", marginTop: spacing.sm },
    posterMeta: { color: nightColors.textMuted, marginTop: spacing.sm },
    qrWrap: { alignItems: "center", marginTop: spacing.lg, gap: spacing.xs },
    qrHint: { color: nightColors.textMuted, fontSize: typography.caption, textAlign: "center" },
    btn: {
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingVertical: spacing.md,
      alignItems: "center",
    },
    btnText: { color: colors.textOnBrand, fontWeight: "800" },
    btnGhost: { backgroundColor: colors.bgSoft, marginTop: spacing.sm },
    btnGhostText: { color: colors.textPrimary, fontWeight: "700" },
    cancel: { textAlign: "center", marginTop: spacing.md, color: colors.textMuted },
  });
}
