import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  visible: boolean;
  title: string;
  hint?: string;
  onClose: () => void;
  onConfirm: (price: number) => void;
};

export function PriceInputModal({ visible, title, hint, onClose, onConfirm }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildPriceInputStyles);
  const [value, setValue] = useState("");

  const submit = () => {
    const price = Number(value);
    if (!Number.isFinite(price) || price <= 0) return;
    onConfirm(price);
    setValue("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.mask}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder={t("priceInput.placeholder")}
            placeholderTextColor={colors.textMuted}
            value={value}
            onChangeText={setValue}
          />
          <View style={styles.row}>
            <Pressable
              style={styles.ghost}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t("common.cancel")}
            >
              <Text style={styles.ghostText}>{t("common.cancel")}</Text>
            </Pressable>
            <Pressable
              style={styles.primary}
              onPress={submit}
              accessibilityRole="button"
              accessibilityLabel={t("common.confirm")}
            >
              <Text style={styles.primaryText}>{t("common.confirm")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function buildPriceInputStyles(colors: ThemeColors) {
  return StyleSheet.create({
    mask: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: spacing.xl },
    card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
    title: { fontSize: typography.h3, fontWeight: "800", color: colors.textPrimary },
    hint: { fontSize: typography.caption, color: colors.textSecondary },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      fontSize: typography.body,
      color: colors.textPrimary,
    },
    row: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
    ghost: { flex: 1, padding: spacing.md, alignItems: "center" },
    ghostText: { color: colors.textSecondary },
    primary: {
      flex: 1,
      backgroundColor: colors.brand,
      borderRadius: radius.md,
      padding: spacing.md,
      alignItems: "center",
    },
    primaryText: { color: colors.textOnBrand, fontWeight: "700" },
  });
}
