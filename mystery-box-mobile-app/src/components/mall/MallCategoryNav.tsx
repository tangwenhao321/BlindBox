import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { useAppTheme } from "../../context/ThemeContext";
import { radius, shadows, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import type { MysteryBoxCategory } from "../../types";
import { dedupeMysteryBoxCategories } from "../../utils/boxDisplay";
import { pickMallCategoryIcon, type MallCategoryIconName } from "../../utils/mallCategoryIcon";

const FALLBACK: readonly { id: string; nameKey: string; icon: MallCategoryIconName }[] = [
  { id: "new", nameKey: "mall.fallbackNew", icon: "calendar-month-outline" },
  { id: "digital", nameKey: "mall.fallbackDigital", icon: "laptop" },
  { id: "apple", nameKey: "mall.fallbackApple", icon: "cellphone" },
  { id: "life", nameKey: "mall.fallbackLife", icon: "home-outline" },
  { id: "hot", nameKey: "mall.fallbackHot", icon: "fire" },
];

type Props = {
  categories: MysteryBoxCategory[];
  activeId?: string;
  onSelect: (categoryId?: string, label?: string) => void;
};

function CategoryGlyph({
  name,
  active,
  brandColor,
  mutedColor,
}: {
  name: MallCategoryIconName;
  active: boolean;
  brandColor: string;
  mutedColor: string;
}) {
  const isHot = name === "fire";
  const color = isHot ? brandColor : active ? brandColor : mutedColor;
  return (
    <MaterialCommunityIcons
      name={name}
      size={22}
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

export function MallCategoryNav({ categories, activeId, onSelect }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildMallNavStyles);

  const items =
    categories.length > 0
      ? dedupeMysteryBoxCategories(categories)
          .slice(0, 8)
          .map((c) => ({
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
        <View style={[styles.iconWrap, !activeId ? styles.iconWrapActive : null]}>
          <CategoryGlyph
            name="tag-outline"
            active={!activeId}
            brandColor={colors.brand}
            mutedColor={colors.textMuted}
          />
        </View>
        <Text style={[styles.label, !activeId ? styles.labelActive : null]}>{t("mall.categoryAll")}</Text>
        {!activeId ? <View style={styles.underline} /> : <View style={styles.underlineSpacer} />}
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
            <View style={[styles.iconWrap, active ? styles.iconWrapActive : null]}>
              <CategoryGlyph
                name={item.icon}
                active={active}
                brandColor={colors.brand}
                mutedColor={colors.textMuted}
              />
            </View>
            <Text style={[styles.label, active ? styles.labelActive : null]} numberOfLines={1}>
              {item.name}
            </Text>
            {active ? <View style={styles.underline} /> : <View style={styles.underlineSpacer} />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function buildMallNavStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: { gap: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm },
    item: { width: 68, alignItems: "center", gap: spacing.xs },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: radius.sm,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgSoft,
      borderBottomWidth: 3,
      borderBottomColor: colors.shelfLip,
      ...shadows.cardSm,
    },
    iconWrapActive: {
      backgroundColor: colors.bgBrandSoft,
      borderColor: colors.chipBorder,
      borderBottomColor: colors.brandDark,
    },
    label: { fontSize: typography.micro, color: colors.textMuted, fontWeight: "600", textAlign: "center" },
    labelActive: { color: colors.brandText, fontWeight: "800" },
    underline: {
      width: 22,
      height: 3,
      borderRadius: 1,
      backgroundColor: colors.brand,
      marginTop: 2,
    },
    underlineSpacer: { width: 22, height: 3, marginTop: 2 },
    pressed: { opacity: 0.88 },
  });
}
