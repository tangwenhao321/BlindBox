import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppGradient } from "../ui/AppGradient";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, shadows, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import type { MysteryBoxCategory } from "../../types";
import { dedupeMysteryBoxCategories } from "../../utils/boxDisplay";
import { pickMallCategoryIcon } from "../../utils/mallCategoryIcon";

const FALLBACK = [
  { id: "new", nameKey: "mall.fallbackNew", icon: "📅" },
  { id: "digital", nameKey: "mall.fallbackDigital", icon: "💻" },
  { id: "apple", nameKey: "mall.fallbackApple", icon: "📱" },
  { id: "life", nameKey: "mall.fallbackLife", icon: "🏠" },
  { id: "hot", nameKey: "mall.fallbackHot", icon: "🔥" },
] as const;

type Props = {
  categories: MysteryBoxCategory[];
  activeId?: string;
  onSelect: (categoryId?: string, label?: string) => void;
};

export function MallCategoryNav({ categories, activeId, onSelect }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildMallNavStyles);

  const items =
    categories.length > 0
      ? dedupeMysteryBoxCategories(categories).slice(0, 8).map((c) => ({
          id: c.id,
          name: c.name,
          icon: pickMallCategoryIcon(c.name),
        }))
      : FALLBACK.map((f) => ({ id: f.id, name: t(f.nameKey), icon: f.icon }));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Pressable
        onPress={() => onSelect(undefined, t("mall.categoryAll"))}
        style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}
        accessibilityRole="button"
        accessibilityState={{ selected: !activeId }}
        accessibilityLabel={t("mall.categoryAll")}
      >
        <AppGradient
          colors={!activeId ? ["#5B4DFF", "#8B5CF6"] : ["#F3F2FF", "#FFFFFF"]}
          style={[styles.iconWrap, !activeId ? styles.iconWrapActive : null]}
        >
          <Text style={styles.icon}>🏷</Text>
        </AppGradient>
        <Text style={[styles.label, !activeId ? styles.labelActive : null]}>{t("mall.categoryAll")}</Text>
      </Pressable>
      {items.map((item) => {
        const active = activeId === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id, item.name)}
            style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.name}
          >
            <AppGradient
              colors={active ? ["#5B4DFF", "#8B5CF6"] : ["#F8F7FF", "#FFFFFF"]}
              style={[styles.iconWrap, active ? styles.iconWrapActive : null]}
            >
              <Text style={styles.icon}>{item.icon}</Text>
            </AppGradient>
            <Text style={[styles.label, active ? styles.labelActive : null]} numberOfLines={1}>
              {item.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function buildMallNavStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: { gap: spacing.lg, paddingVertical: spacing.sm, marginBottom: spacing.md },
    item: { width: 64, alignItems: "center", gap: spacing.xs },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.cardSm,
    },
    iconWrapActive: { borderColor: "transparent" },
    icon: { fontSize: 22 },
    label: { fontSize: typography.micro, color: colors.textMuted, fontWeight: "600", textAlign: "center" },
    labelActive: { color: colors.brand, fontWeight: "800" },
    pressed: { opacity: 0.88 },
  });
}
