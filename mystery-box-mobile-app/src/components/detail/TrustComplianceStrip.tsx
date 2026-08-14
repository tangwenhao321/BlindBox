import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import type { TrustMeta } from "../../services/trustMetaService";
import { FairnessTrustRow } from "../FairnessTrustRow";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  meta: TrustMeta | null;
  onOpenProbability?: () => void;
};

export function TrustComplianceStrip({ meta, onOpenProbability }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildTrustStripStyles);

  if (!meta) {
    return <FairnessTrustRow onOpenProbability={onOpenProbability} />;
  }
  const probTime = meta.probabilityUpdatedAt ? new Date(meta.probabilityUpdatedAt).toLocaleString() : "—";

  return (
    <View style={styles.wrap}>
      <Text style={styles.line}>{meta.shippingPromise}</Text>
      <Text style={styles.line}>{meta.minorProtectionHint}</Text>
      <Text style={styles.line}>{t("boxDetails.trustProbUpdated", { time: probTime })}</Text>
      <FairnessTrustRow onOpenProbability={onOpenProbability} />
      {onOpenProbability ? (
        <Pressable
          onPress={onOpenProbability}
          accessibilityRole="button"
          accessibilityLabel={meta.disclosureNote || t("trust.viewDisclosure")}
        >
          <Text style={styles.link}>{meta.disclosureNote || t("trust.viewDisclosure")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function buildTrustStripStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.bgCard,
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    line: { fontSize: typography.caption, color: colors.textSecondary },
    link: { fontSize: typography.caption, color: colors.brand, marginTop: spacing.xs },
  });
}
