import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { useThemedStyles } from "../../hooks/useThemedStyles";

import { spacing, typography } from "../../styles/tokens";

import type { ThemeColors } from "../../styles/themes";



type Props = {

  isFavorite: boolean;

  onToggleFavorite: () => void;

  onContactSupport?: () => void;

  onOpenLeaderboard?: () => void;

  onOpenHint?: () => void;

};



export function BoxDetailsHeaderActions({

  isFavorite,

  onToggleFavorite,

  onContactSupport,

  onOpenLeaderboard,

  onOpenHint,

}: Props) {

  const { t } = useTranslation();

  const styles = useThemedStyles(buildHeaderActionsStyles);



  return (

    <View style={styles.headerActions}>

      <Pressable

        style={styles.headerAction}

        onPress={onContactSupport}

        accessibilityRole="button"

        accessibilityLabel={t("boxDetails.actionSupport")}

      >

        <Text style={styles.headerActionIcon}>🎧</Text>

        <Text style={styles.headerActionText}>{t("boxDetails.actionSupport")}</Text>

      </Pressable>

      {onOpenHint ? (

        <Pressable

          style={styles.headerAction}

          onPress={onOpenHint}

          accessibilityRole="button"

          accessibilityLabel={t("boxDetails.hintOpenA11y")}

        >

          <Text style={styles.headerActionIcon}>💡</Text>

          <Text style={styles.headerActionText}>{t("boxDetails.hintOpenShort")}</Text>

        </Pressable>

      ) : null}

      <Pressable

        style={styles.headerAction}

        onPress={() => void onToggleFavorite()}

        accessibilityRole="button"

        accessibilityLabel={t("boxDetails.actionFavorite")}

        accessibilityState={{ selected: isFavorite }}

      >

        <Text style={styles.headerActionIcon}>{isFavorite ? "★" : "☆"}</Text>

        <Text style={styles.headerActionText}>{t("boxDetails.actionFavorite")}</Text>

      </Pressable>

      {onOpenLeaderboard ? (

        <Pressable

          style={styles.headerAction}

          onPress={onOpenLeaderboard}

          accessibilityRole="button"

          accessibilityLabel={t("boxDetails.actionLeaderboard")}

        >

          <Text style={styles.headerActionIcon}>🏆</Text>

          <Text style={styles.headerActionText}>{t("boxDetails.actionLeaderboard")}</Text>

        </Pressable>

      ) : null}

    </View>

  );

}



function buildHeaderActionsStyles(colors: ThemeColors) {

  return StyleSheet.create({

    headerActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, alignItems: "center", justifyContent: "flex-end" },

    headerAction: { alignItems: "center", minWidth: 36 },

    headerActionIcon: { fontSize: 16 },

    headerActionText: { fontSize: typography.micro, color: colors.textSecondary, marginTop: 2 },

  });

}

