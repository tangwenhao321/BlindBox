import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";

type Props = { visible: boolean; message?: string };

export function NetworkBanner({ visible, message }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildNetworkBannerStyles);
  const text = message ?? t("networkBanner.message");

  if (!visible) {
    return null;
  }
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

function buildNetworkBannerStyles(colors: ThemeColors) {
  return {
    wrap: {
      backgroundColor: colors.warningSoft,
      borderBottomWidth: 1,
      borderBottomColor: colors.warningSoftBorder,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    text: {
      color: colors.warning,
      fontSize: typography.caption,
      fontWeight: "700" as const,
      textAlign: "center" as const,
    },
  };
}
