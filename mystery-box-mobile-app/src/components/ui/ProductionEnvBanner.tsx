import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import { getProductionEnvWarnings } from "../../utils/productionEnvCheck";
import { dismissProductionEnvBanner, shouldShowProductionEnvBanner } from "../../utils/uxGuideStorage";

export function ProductionEnvBanner() {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildProductionEnvBannerStyles);
  const warnings = getProductionEnvWarnings();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!warnings.length) return;
    void shouldShowProductionEnvBanner().then(setVisible);
  }, [warnings.length]);

  if (!warnings.length || !visible) return null;

  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Text style={styles.title}>{t("productionEnv.userBannerTitle")}</Text>
      {warnings.map((line) => (
        <Text key={line} style={styles.line}>
          · {line}
        </Text>
      ))}
      <Pressable
        style={styles.dismissBtn}
        onPress={() => {
          setVisible(false);
          void dismissProductionEnvBanner();
        }}
        accessibilityRole="button"
        accessibilityLabel={t("productionEnv.userBannerDismiss")}
      >
        <Text style={styles.dismissText}>{t("productionEnv.userBannerDismiss")}</Text>
      </Pressable>
    </View>
  );
}

function buildProductionEnvBannerStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      marginHorizontal: spacing.md,
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.warningSoft,
      borderWidth: 1,
      borderColor: colors.warning,
      gap: spacing.xs,
    },
    title: { fontWeight: "800", color: colors.warning, fontSize: typography.caption },
    line: { color: colors.textPrimary, fontSize: typography.micro, lineHeight: 18 },
    dismissBtn: { alignSelf: "flex-end", marginTop: spacing.xs },
    dismissText: { color: colors.brand, fontWeight: "800", fontSize: typography.caption },
  });
}
