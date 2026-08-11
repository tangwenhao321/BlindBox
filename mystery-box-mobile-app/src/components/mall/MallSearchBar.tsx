import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { useAppTheme } from "../../context/ThemeContext";
import { layout, radius, shadows, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (keyword: string) => void;
  onClear?: () => void;
  loading?: boolean;
  autoFocus?: boolean;
};

export function MallSearchBar({ value, onChangeText, onSubmit, onClear, loading, autoFocus }: Props) {
  const { t } = useTranslation();
  const { colors: themeColors } = useAppTheme();
  const styles = useThemedStyles(buildMallSearchBarStyles);

  const handleSubmit = () => {
    onSubmit(value.trim());
  };

  return (
    <View style={styles.row}>
      <View style={styles.inputWrap}>
        <Ionicons
          name="search-outline"
          size={16}
          color={themeColors.textMuted}
          style={styles.searchIcon}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={t("mall.searchPlaceholder")}
          placeholderTextColor={themeColors.textPlaceholder}
          style={styles.input}
          returnKeyType="search"
          autoFocus={autoFocus}
          onSubmitEditing={handleSubmit}
          accessibilityLabel={t("mall.searchA11y")}
        />
        {value.length > 0 && onClear ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("mall.searchClear")}
            onPress={onClear}
            hitSlop={8}
            style={({ pressed }) => [styles.clearBtn, pressed ? styles.pressed : null]}
          >
            <Text style={styles.clearText}>×</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("mall.searchBtn")}
        onPress={handleSubmit}
        disabled={loading}
        style={({ pressed }) => [styles.searchBtn, pressed ? styles.pressed : null, loading ? styles.disabled : null]}
      >
        {loading ? (
          <ActivityIndicator color={themeColors.textOnBrand} size="small" />
        ) : (
          <Text style={styles.searchBtnText}>{t("mall.searchBtn")}</Text>
        )}
      </Pressable>
    </View>
  );
}

function buildMallSearchBarStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm, alignItems: "center" },
    inputWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.bgCard,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      minHeight: 44,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.cardSm,
    },
    searchIcon: { marginEnd: spacing.xs },
    input: { flex: 1, fontSize: typography.body, color: colors.textPrimary, paddingVertical: spacing.sm },
    clearBtn: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.bgSoft,
      alignItems: "center",
      justifyContent: "center",
      marginStart: spacing.xs,
    },
    clearText: { fontSize: 16, lineHeight: 18, color: colors.textMuted, fontWeight: "700" },
    searchBtn: {
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingHorizontal: layout.screenPaddingX,
      minHeight: 44,
      justifyContent: "center",
      alignItems: "center",
      minWidth: 64,
    },
    searchBtnText: { color: colors.textOnBrand, fontWeight: "800", fontSize: typography.caption },
    pressed: { opacity: 0.9 },
    disabled: { opacity: 0.6 },
  });
}
