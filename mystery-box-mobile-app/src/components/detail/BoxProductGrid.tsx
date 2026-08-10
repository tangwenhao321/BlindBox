import { Dimensions, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { QualityBadge } from "../ui/QualityBadge";
import { RemoteImage } from "../ui/RemoteImage";
import { layout, radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import type { Product } from "../../types";
import { listItemKey, uniqueProducts } from "../../utils/boxDisplay";
import { resolveProductImageUrl } from "../../utils/boxImage";
import { formatCurrency } from "../../utils/formatCurrency";

const { width: SCREEN_W } = Dimensions.get("window");
const CELL_W = (SCREEN_W - layout.screenPaddingX * 2 - spacing.sm * 2) / 3;

type Props = {
  products: Product[];
};

export function BoxProductGrid({ products }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildProductGridStyles);
  const items = uniqueProducts(products);
  if (!items.length) return null;

  return (
    <>
      <Text style={styles.gridTitle}>{t("boxDetails.productGridTitle", { count: items.length })}</Text>
      <View style={styles.productGrid}>
        {items.map((product, index) => (
          <View key={listItemKey(product.id, index, "prize")} style={styles.productCell}>
            <RemoteImage uri={resolveProductImageUrl(product.id, product.name)} style={styles.productImage} />
            <View style={styles.productBadge}>
              <QualityBadge tier={product.qualityType} compact />
            </View>
            <Text style={styles.productName} numberOfLines={2}>
              {product.name}
            </Text>
            <Text style={styles.productPrice}>{formatCurrency(product.price ?? 0)}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function buildProductGridStyles(colors: ThemeColors) {
  return StyleSheet.create({
    gridTitle: { fontWeight: "800", color: colors.textPrimary, marginBottom: spacing.sm },
    productGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    productCell: {
      width: CELL_W,
      backgroundColor: colors.bgCard,
      borderRadius: radius.md,
      padding: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
    },
    productImage: { width: "100%", aspectRatio: 1, borderRadius: radius.sm },
    productBadge: { marginTop: spacing.xs },
    productName: { fontSize: typography.micro, color: colors.textPrimary, marginTop: 2, minHeight: 28 },
    productPrice: { fontSize: typography.micro, color: colors.brand, fontWeight: "800" },
  });
}
