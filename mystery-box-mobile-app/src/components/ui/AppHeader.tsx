import { useMemo, type ReactNode } from "react";

import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { useScreenStyles } from "../../styles/screenStyles";

import { useAppTheme } from "../../context/ThemeContext";

import { spacing, typography } from "../../styles/tokens";



export type AppHeaderVariant = "default" | "centered";



type Props = {

  variant?: AppHeaderVariant;

  title: string;

  subtitle?: string;

  onBack?: () => void;

  backLabel?: string;

  rightActions?: ReactNode;

};



export function AppHeader({

  variant = "default",

  title,

  subtitle,

  onBack,

  backLabel,

  rightActions,

}: Props) {

  const { t } = useTranslation();

  const { colors } = useAppTheme();

  const screenStyles = useScreenStyles();

  const resolvedBackLabel = backLabel ?? t("common.back");



  const styles = useMemo(

    () =>

      StyleSheet.create({

        wrap: {

          ...screenStyles.pageHeader,

          marginBottom: spacing.md,

          overflow: "hidden",

        },

        backBtn: {

          flexDirection: "row",

          alignItems: "center",

          alignSelf: "flex-start",

          marginBottom: spacing.md,

          paddingVertical: spacing.xs,

          paddingRight: spacing.md,

        },

        backIcon: {

          fontSize: 22,

          fontWeight: "800",

          color: colors.brand,

          marginRight: 2,

          lineHeight: 24,

        },

        backLabel: {

          color: colors.brand,

          fontWeight: "800",

          fontSize: typography.caption,

        },

        row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },

        textCol: { flex: 1, paddingRight: spacing.sm },

        title: {

          fontSize: typography.h3,

          fontWeight: "800",

          color: colors.textPrimary,

          letterSpacing: -0.3,

        },

        subtitle: {

          marginTop: spacing.xs,

          color: colors.textSecondary,

          fontSize: typography.caption,

          lineHeight: 20,

        },

        centeredWrap: {

          backgroundColor: colors.bgCard,

          borderBottomWidth: StyleSheet.hairlineWidth,

          borderBottomColor: colors.border,

          paddingBottom: spacing.md,

          paddingTop: spacing.sm,

          paddingHorizontal: spacing.lg,

        },

        centeredRow: {

          flexDirection: "row",

          alignItems: "center",

          minHeight: 40,

        },

        centeredSide: { width: 56, alignItems: "flex-end", justifyContent: "center" },

        centeredBackIcon: {

          fontSize: 28,

          fontWeight: "300",

          color: colors.textPrimary,

          lineHeight: 32,

          alignSelf: "flex-start",

        },

        centeredTitle: {

          flex: 1,

          textAlign: "center",

          fontSize: typography.h4,

          fontWeight: "700",

          color: colors.textPrimary,

        },

      }),

    [colors, screenStyles],

  );



  if (variant === "centered") {

    return (

      <View style={styles.centeredWrap}>

        <View style={styles.centeredRow}>

          {onBack ? (

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={resolvedBackLabel}
              onPress={onBack}
              style={styles.centeredSide}
            >

              <Text style={styles.centeredBackIcon}>‹</Text>

            </Pressable>

          ) : (

            <View style={styles.centeredSide} />

          )}

          <Text style={styles.centeredTitle} numberOfLines={1}>

            {title}

          </Text>

          <View style={styles.centeredSide}>{rightActions ?? null}</View>

        </View>

      </View>

    );

  }



  return (

    <View style={styles.wrap}>

      {onBack ? (

        <Pressable

          accessibilityRole="button"

          accessibilityLabel={resolvedBackLabel}

          style={({ pressed }) => [styles.backBtn, pressed ? screenStyles.pressed : null]}

          onPress={onBack}

        >

          <Text style={styles.backIcon}>‹</Text>

          <Text style={styles.backLabel}>{resolvedBackLabel}</Text>

        </Pressable>

      ) : (

        <View style={screenStyles.accentBar} />

      )}

      <View style={styles.row}>

        <View style={styles.textCol}>

          <Text style={styles.title}>{title}</Text>

          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

        </View>

        {rightActions}

      </View>

    </View>

  );

}


