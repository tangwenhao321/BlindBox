import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { OptimizedFlatList } from "../ui/OptimizedFlatList";
import { RemoteImage } from "../ui/RemoteImage";
import type { HotBox } from "../../services/homeService";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
import { dedupeHotBoxes } from "../../utils/boxDisplay";
import { resolveBoxImageUrl } from "../../utils/boxImage";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  boxes: HotBox[];
  onOpenBox: (id: string) => void;
};

export function HotPoolCarousel({ boxes, onOpenBox }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildHotPoolStyles);
  const data = dedupeHotBoxes(boxes);
  if (!data.length) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t("home.hotPoolTitle")}</Text>
      <OptimizedFlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => onOpenBox(item.id)}
            accessibilityRole="button"
            accessibilityLabel={item.name}
          >
            <RemoteImage
              uri={resolveBoxImageUrl({ id: item.id, name: item.name, cover: item.cover })}
              style={styles.cover}
            />
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.meta}>
              {t("home.hotPoolMeta", {
                sold: Math.max(0, (item.poolTotal ?? 0) - (item.poolRemaining ?? 0)),
                draws: item.drawCount7d,
              })}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function buildHotPoolStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { marginBottom: spacing.lg },
    title: {
      fontSize: typography.h3,
      fontWeight: "800",
      color: colors.textPrimary,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
    },
    list: { paddingHorizontal: spacing.lg, gap: spacing.md },
    card: {
      width: 140,
      backgroundColor: colors.bgSoft,
      borderRadius: radius.lg,
      overflow: "hidden",
    },
    cover: { width: 140, height: 100 },
    name: {
      fontSize: typography.caption,
      fontWeight: "600",
      padding: spacing.sm,
      color: colors.textPrimary,
    },
    meta: {
      fontSize: typography.caption,
      color: colors.textSecondary,
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.sm,
    },
  });
}
