import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  getPendingAnalyticsCount,
  shouldShowAnalyticsQueueHint,
  subscribeAnalyticsQueue,
} from "../../utils/analytics";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

const DISMISS_KEY = "analytics_queue_banner_dismissed_v1";

type Props = {
  onDismiss?: () => void;
};

export function AnalyticsQueueBanner({ onDismiss }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildAnalyticsQueueBannerStyles);
  const [dismissed, setDismissed] = useState(false);
  const [pending, setPending] = useState(getPendingAnalyticsCount());
  const visible = !dismissed && shouldShowAnalyticsQueueHint();

  useEffect(() => {
    void AsyncStorage.getItem(DISMISS_KEY).then((value) => {
      if (value === "1") setDismissed(true);
    });
  }, []);

  useEffect(() => {
    return subscribeAnalyticsQueue((count) => {
      setPending(count);
    });
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    void AsyncStorage.setItem(DISMISS_KEY, "1");
    onDismiss?.();
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Text style={styles.text}>{t("analyticsQueue.message", { count: pending })}</Text>
      <Pressable
        onPress={handleDismiss}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t("analyticsQueue.dismissA11y")}
      >
        <Text style={styles.dismiss}>{t("analyticsQueue.dismiss")}</Text>
      </Pressable>
    </View>
  );
}

function buildAnalyticsQueueBannerStyles(colors: ThemeColors) {
  return {
    wrap: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: spacing.sm,
      backgroundColor: colors.bgSoft,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    text: { flex: 1, color: colors.textSecondary, fontSize: typography.micro, lineHeight: 16 },
    dismiss: { color: colors.brand, fontWeight: "700" as const, fontSize: typography.micro },
  };
}
