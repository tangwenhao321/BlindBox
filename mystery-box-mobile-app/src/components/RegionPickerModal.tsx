import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput } from "react-native";
import { useTranslation } from "react-i18next";
import { OptimizedFlatList } from "./ui/OptimizedFlatList";
import { useAppTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { CHINA_REGION_OPTIONS } from "../data/chinaRegions";
import { getVietnamRegionOptions } from "../data/vietnamRegions";
import { getAppLocale } from "../utils/i18nLocale";
import { layout, radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";

type Props = {
  visible: boolean;
  selected?: string;
  title?: string;
  optionList?: string[];
  onClose: () => void;
  onSelect: (region: string) => void;
};

export function RegionPickerModal({ visible, selected, title, optionList, onClose, onSelect }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildRegionPickerStyles);
  const [keyword, setKeyword] = useState("");

  const regionOptions = useMemo(() => {
    if (optionList?.length) return optionList;
    return getAppLocale() === "vi-VN" ? getVietnamRegionOptions() : [...CHINA_REGION_OPTIONS];
  }, [optionList]);

  const filteredOptions = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return regionOptions;
    return regionOptions.filter((item) => item.toLowerCase().includes(q));
  }, [keyword, regionOptions]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} accessibilityViewIsModal>
      <Pressable style={styles.mask} onPress={onClose} accessibilityLabel={t("address.regionCloseA11y")}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()} accessibilityLabel={t("address.regionSheetA11y")}>
          <Text style={styles.title}>{title ?? t("address.selectRegion")}</Text>
          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder={t("address.regionSearchPlaceholder")}
            placeholderTextColor={colors.textPlaceholder}
            style={styles.search}
            accessibilityLabel={t("address.regionSearchA11y")}
          />
          <OptimizedFlatList
            data={filteredOptions}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>{t("address.regionEmpty")}</Text>}
            renderItem={({ item }) => {
              const active = item === selected;
              return (
                <Pressable
                  style={[styles.row, active ? styles.rowActive : null]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={item}
                >
                  <Text style={[styles.rowText, active ? styles.rowTextActive : null]}>{item}</Text>
                </Pressable>
              );
            }}
          />
          <Pressable style={styles.cancelBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("common.cancel")}>
            <Text style={styles.cancelText}>{t("common.cancel")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function buildRegionPickerStyles(colors: ThemeColors) {
  return StyleSheet.create({
    mask: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
    sheet: {
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: layout.screenPaddingX,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
      maxHeight: "78%",
    },
    title: { fontSize: typography.h4, fontWeight: "800", color: colors.textPrimary, marginBottom: spacing.md },
    search: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: typography.body,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    list: { maxHeight: 360 },
    row: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowActive: { backgroundColor: colors.bgBrandSoft },
    rowText: { fontSize: typography.body, color: colors.textPrimary },
    rowTextActive: { color: colors.brand, fontWeight: "700" },
    empty: { textAlign: "center", color: colors.textMuted, padding: spacing.xl },
    cancelBtn: { marginTop: spacing.md, alignItems: "center", paddingVertical: spacing.sm },
    cancelText: { color: colors.textSecondary, fontSize: typography.body },
  });
}
