import { useEffect, useMemo, useState } from "react";

import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import {

  subscribeOfflineMutationQueue,

  type OfflineQueueSnapshot,

} from "../../offline/offlineMutationQueue";

import { resolveOfflineActionLabel } from "../../utils/offlineActionLabel";

import { useThemedStyles } from "../../hooks/useThemedStyles";

import { spacing, typography } from "../../styles/tokens";

import type { ThemeColors } from "../../styles/themes";



type Props = {

  onRetry?: () => void;

};



export function buildOfflinePendingActions(snapshot: OfflineQueueSnapshot, separator: string): string[] {

  return snapshot.labels.map((label) => resolveOfflineActionLabel(label));

}



export function OfflineBanner({ onRetry }: Props) {

  const { t } = useTranslation();

  const styles = useThemedStyles(buildOfflineBannerStyles);

  const [snapshot, setSnapshot] = useState<OfflineQueueSnapshot>({ count: 0, labels: [], items: [] });

  const [expanded, setExpanded] = useState(false);



  useEffect(() => subscribeOfflineMutationQueue(setSnapshot), []);



  const actionLabels = useMemo(

    () => buildOfflinePendingActions(snapshot, t("offline.actionSeparator")),

    [snapshot, t],

  );



  const pendingHint = useMemo(() => {

    if (snapshot.count <= 0) return "";

    if (!expanded) {

      return t("offline.pendingSyncCollapsed", { count: snapshot.count });

    }

    return t("offline.pendingSync", { count: snapshot.count, actions: actionLabels.join(t("offline.actionSeparator")) });

  }, [actionLabels, expanded, snapshot.count, t]);



  return (

    <View style={styles.wrap} accessibilityRole="alert" testID="offlineBanner">

      <Pressable

        style={styles.textCol}

        accessibilityRole="button"

        accessibilityLabel={t("offline.expandA11y", { count: snapshot.count })}

        onPress={() => snapshot.count > 0 && setExpanded((v) => !v)}

        disabled={snapshot.count <= 0}

      >

        <Text style={styles.text} accessibilityLiveRegion="polite">

          {t("offline.banner")}

          {pendingHint}

        </Text>

        {snapshot.count > 0 ? (

          <View style={styles.actionList}>

            {expanded

              ? actionLabels.map((label) => (

                  <Text key={label} style={styles.actionItem}>

                    · {label}

                  </Text>

                ))

              : null}

          </View>

        ) : null}

      </Pressable>

      {onRetry ? (

        <Pressable

          accessibilityRole="button"

          accessibilityLabel={t("offline.retry")}

          onPress={onRetry}

          hitSlop={8}

        >

          <Text style={styles.retry}>{t("offline.retry")}</Text>

        </Pressable>

      ) : null}

    </View>

  );

}



function buildOfflineBannerStyles(colors: ThemeColors) {

  return StyleSheet.create({

    wrap: {

      backgroundColor: colors.warningSoft,

      borderBottomWidth: StyleSheet.hairlineWidth,

      borderBottomColor: colors.warningSoftBorder,

      paddingHorizontal: spacing.lg,

      paddingVertical: spacing.sm,

      flexDirection: "row",

      alignItems: "flex-start",

      justifyContent: "space-between",

      gap: spacing.md,

    },

    textCol: { flex: 1, gap: 2 },

    text: { color: colors.orderUnpaidText, fontSize: typography.caption, fontWeight: "600" },

    actionList: { marginTop: spacing.xs, gap: 2 },

    actionItem: { color: colors.orderUnpaidText, fontSize: typography.micro },

    retry: { color: colors.brand, fontWeight: "800", fontSize: typography.caption },

  });

}


