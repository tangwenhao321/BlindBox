import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../context/ThemeContext";
import type { Product } from "../../types";
import { QualityBadge } from "./QualityBadge";
import { normalizeQualityTier } from "../../utils/quality";

type Props = {
  products: Product[];
  onSkip?: () => void;
};

function tierBorderColor(tier: string): string {
  if (tier === "LEGENDARY" || tier === "LEGEND") return "#F59E0B";
  if (tier === "HIDDEN" || tier === "EPIC") return "#A855F7";
  return "transparent";
}

export function RevealStaticFallback({ products, onSkip }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <View style={styles.host}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const tier = normalizeQualityTier(item.qualityType);
          const accent = tierBorderColor(tier);
          return (
            <View
              style={[
                styles.row,
                { borderColor: colors.border, borderLeftColor: accent, borderLeftWidth: accent === "transparent" ? StyleSheet.hairlineWidth : 4 },
              ]}
            >
              <View style={styles.rowMain}>
                <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.qualityType ? <QualityBadge tier={item.qualityType} /> : null}
              </View>
            </View>
          );
        }}
      />
      {onSkip ? (
        <Pressable
          accessibilityRole="button"
          onPress={onSkip}
          style={[styles.skipBtn, { backgroundColor: colors.bgSoft }]}
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>
            {t("orderResult.skipRemaining")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  list: { padding: 16, gap: 8 },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowMain: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { fontSize: 15, fontWeight: "500", flex: 1 },
  skipBtn: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  skipText: { fontSize: 14, fontWeight: "600" },
});
