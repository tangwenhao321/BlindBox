import { useState } from "react";
import { Clipboard, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import type { Order } from "../types";
import { getOrderBoxName } from "../order-utils";
import { buildOrderShareMessage } from "../utils/orderShareDraft";
import { toast } from "../utils/toast";

type Props = {
  order: Order;
  topPrizeName?: string;
  onSharePoster: () => void;
  onShareCommunity?: () => void;
};

export function OrderShareCard({ order, topPrizeName, onSharePoster, onShareCommunity }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildOrderShareStyles);
  const [expanded, setExpanded] = useState(false);
  const boxName = getOrderBoxName(order);
  const drawCount = order.items?.[0]?.mysteryBoxCount ?? 1;

  const copyShareText = () => {
    const message = buildOrderShareMessage(t, order, topPrizeName);
    Clipboard.setString(message);
    toast.success(t("sharePoster.copyDone"));
  };

  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("orderDetails.share.toggleA11y")}
        onPress={() => setExpanded((v) => !v)}
        style={styles.head}
      >
        <Text style={styles.title}>{t("orderDetails.share.title")}</Text>
        <Text style={styles.chevron}>{expanded ? "▲" : "▼"}</Text>
      </Pressable>
      {expanded ? (
        <View style={styles.body}>
          <Text style={styles.meta}>
            {t("orderDetails.share.summary", {
              boxName,
              count: drawCount,
              prize: topPrizeName ? t("orderDetails.share.prizeLine", { name: topPrizeName }) : "",
            })}
          </Text>
          <View style={styles.actions}>
            <Pressable
              style={styles.btn}
              accessibilityRole="button"
              accessibilityLabel={t("orderDetails.share.posterA11y")}
              onPress={onSharePoster}
            >
              <Text style={styles.btnText}>{t("orderDetails.share.poster")}</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnGhost]}
              accessibilityRole="button"
              accessibilityLabel={t("sharePoster.copyTextA11y")}
              onPress={copyShareText}
            >
              <Text style={[styles.btnText, styles.btnGhostText]}>{t("sharePoster.copyText")}</Text>
            </Pressable>
            {onShareCommunity ? (
              <Pressable
                style={[styles.btn, styles.btnGhost]}
                accessibilityRole="button"
                accessibilityLabel={t("orderDetails.share.communityA11y")}
                onPress={onShareCommunity}
              >
                <Text style={[styles.btnText, styles.btnGhostText]}>{t("orderDetails.share.community")}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function buildOrderShareStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.md,
      overflow: "hidden",
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: spacing.md,
    },
    title: { fontWeight: "800", fontSize: typography.body, color: colors.textPrimary },
    chevron: { color: colors.textMuted, fontSize: typography.caption },
    body: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
    meta: { fontSize: typography.caption, color: colors.textSecondary, lineHeight: 20 },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    btn: {
      flexGrow: 1,
      flexBasis: "30%",
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingVertical: spacing.sm,
      alignItems: "center",
    },
    btnText: { color: colors.textOnBrand, fontWeight: "800", fontSize: typography.caption },
    btnGhost: { backgroundColor: colors.bgSoft },
    btnGhostText: { color: colors.textPrimary },
  });
}
