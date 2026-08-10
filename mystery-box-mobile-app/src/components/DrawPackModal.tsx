import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { PrimaryButton } from "./ui/PrimaryButton";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { radius, shadows, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { formatCurrency } from "../utils/formatCurrency";

export type DrawPackOption = {
  count: number;
  label: string;
  price: number;
  originalPrice?: number;
  discountTag?: string;
};

type Props = {
  visible: boolean;
  boxName: string;
  unitPrice: number;
  options: DrawPackOption[];
  selectedCount: number;
  onSelectCount: (count: number) => void;
  onClose: () => void;
  onConfirm: () => void;
  confirming: boolean;
  canSubmit: boolean;
  priceHint: string;
  hasAddress: boolean;
  /** When false, do not block checkout for missing address (open-box flow). */
  requireAddress?: boolean;
  onAddAddress: () => void;
  poolTotal?: number;
  poolRemaining?: number;
  wholeBoxDrawCount?: number;
};

function pickBestValueCount(options: DrawPackOption[]) {
  let best: { count: number; saved: number } | null = null;
  for (const opt of options) {
    const original = opt.originalPrice ?? opt.price;
    const saved = original - opt.price;
    if (saved <= 0.01) continue;
    if (!best || saved > best.saved) best = { count: opt.count, saved };
  }
  return best?.count ?? null;
}

export function DrawPackModal({
  visible,
  boxName,
  options,
  selectedCount,
  onSelectCount,
  onClose,
  onConfirm,
  confirming,
  canSubmit,
  priceHint,
  hasAddress,
  requireAddress = true,
  onAddAddress,
  poolTotal,
  poolRemaining,
  wholeBoxDrawCount,
}: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildDrawPackStyles);
  const bestValueCount = pickBestValueCount(options);
  const showPoolInfo = typeof poolTotal === "number" && poolTotal > 0;
  const wholeBoxOption = wholeBoxDrawCount
    ? options.find((opt) => opt.count === wholeBoxDrawCount)
    : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} accessibilityViewIsModal>
      <Pressable style={styles.mask} onPress={onClose} accessibilityLabel={t("drawPack.closeA11y")}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()} accessibilityLabel={t("drawPack.sheetA11y")}>
          <View style={styles.handle} />
          <View style={styles.head}>
            <Text style={styles.title}>{t("drawPack.title")}</Text>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t("drawPack.close")}>
              <Text style={styles.close}>×</Text>
            </Pressable>
          </View>
          <Text style={styles.sub}>{boxName}</Text>
          {showPoolInfo ? (
            <View style={styles.poolInfo}>
              <Text style={styles.poolInfoText}>
                {t("drawPack.poolRemaining", { remaining: poolRemaining ?? poolTotal, total: poolTotal })}
              </Text>
              {wholeBoxOption ? (
                <Text style={styles.poolInfoSub}>
                  {t("drawPack.wholeBox", { count: wholeBoxOption.count, price: formatCurrency(wholeBoxOption.price) })}
                  {wholeBoxOption.discountTag ? ` · ${wholeBoxOption.discountTag}` : ""}
                </Text>
              ) : wholeBoxDrawCount ? (
                <Text style={styles.poolInfoSub}>{t("drawPack.wholeBoxEstimate", { count: wholeBoxDrawCount })}</Text>
              ) : null}
            </View>
          ) : null}
          <View style={styles.grid}>
            {options.map((opt) => {
              const active = selectedCount === opt.count;
              const isBest = bestValueCount === opt.count;
              return (
                <Pressable
                  key={opt.count}
                  style={[styles.packCard, active ? styles.packCardActive : null]}
                  onPress={() => onSelectCount(opt.count)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t("drawPack.optionA11y", {
                    label: opt.label,
                    price: formatCurrency(opt.price),
                    best: isBest ? t("drawPack.bestValue") : "",
                  })}
                >
                  {isBest ? <Text style={styles.bestTag}>{t("drawPack.bestTag")}</Text> : null}
                  {opt.discountTag ? <Text style={styles.discountTag}>{opt.discountTag}</Text> : null}
                  <Text style={styles.packLabel}>{opt.label}</Text>
                  <Text style={[styles.packPrice, active ? styles.packPriceActive : null]}>{formatCurrency(opt.price)}</Text>
                  {opt.originalPrice ? (
                    <Text style={styles.packOriginal}>{formatCurrency(opt.originalPrice)}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          {requireAddress && !hasAddress ? (
            <Pressable style={styles.addressWarn} onPress={onAddAddress} accessibilityRole="button" accessibilityLabel={t("drawPack.addressRequiredA11y")}>
              <Text style={styles.addressWarnText}>{t("drawPack.addressRequired")}</Text>
            </Pressable>
          ) : null}
          <Text style={styles.hint}>{priceHint}</Text>
          <PrimaryButton
            testID="drawPackConfirmButton"
            accessibilityLabel={confirming ? t("drawPack.confirmingA11y") : t("drawPack.confirmA11y")}
            label={confirming ? t("drawPack.confirming") : t("drawPack.confirm")}
            loading={confirming}
            disabled={!canSubmit || confirming}
            onPress={onConfirm}
            style={styles.confirmBtn}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function buildDrawPackStyles(colors: ThemeColors) {
  return StyleSheet.create({
    mask: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
    sheet: {
      backgroundColor: colors.bgPage,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.sm,
      ...shadows.card,
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: spacing.xs,
    },
    head: { alignItems: "center", justifyContent: "center", position: "relative" },
    title: { fontSize: typography.h4, fontWeight: "800", color: colors.textPrimary },
    closeBtn: { position: "absolute", right: 0, top: 0, padding: 4 },
    close: { fontSize: 28, color: colors.textMuted, lineHeight: 28 },
    sub: { textAlign: "center", color: colors.textSecondary, fontSize: typography.caption, marginBottom: spacing.sm },
    poolInfo: {
      backgroundColor: colors.bgBrandSoft,
      borderRadius: radius.md,
      padding: spacing.sm,
      marginBottom: spacing.sm,
      gap: 2,
    },
    poolInfoText: { textAlign: "center", color: colors.brand, fontWeight: "800", fontSize: typography.caption },
    poolInfoSub: { textAlign: "center", color: colors.textSecondary, fontSize: typography.micro },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" },
    packCard: {
      width: "48%",
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgCard,
      padding: spacing.md,
      alignItems: "center",
      minHeight: 88,
    },
    packCardActive: { borderColor: colors.brand, backgroundColor: colors.bgBrandSoft },
    bestTag: {
      position: "absolute",
      top: -8,
      left: 8,
      backgroundColor: colors.brand,
      color: colors.textOnBrand,
      fontSize: typography.micro,
      fontWeight: "800",
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.pill,
      overflow: "hidden",
    },
    discountTag: {
      position: "absolute",
      top: -8,
      right: 8,
      backgroundColor: colors.danger,
      color: colors.textOnBrand,
      fontSize: typography.micro,
      fontWeight: "800",
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.pill,
      overflow: "hidden",
    },
    packLabel: { fontWeight: "800", color: colors.textPrimary, fontSize: typography.body },
    packPrice: { marginTop: spacing.xs, fontWeight: "800", color: colors.textSecondary, fontSize: typography.bodyLg },
    packPriceActive: { color: colors.brand },
    packOriginal: {
      marginTop: 2,
      textDecorationLine: "line-through",
      color: colors.textMuted,
      fontSize: typography.micro,
    },
    addressWarn: { alignItems: "center", paddingVertical: spacing.sm },
    addressWarnText: { color: colors.danger, fontWeight: "700", fontSize: typography.caption },
    hint: { textAlign: "center", color: colors.textMuted, fontSize: typography.caption },
    confirmBtn: { marginTop: spacing.sm },
  });
}
