import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { AppUpdateController } from "../hooks/useAppUpdate";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { PrimaryButton } from "./ui/PrimaryButton";
import { radius, shadows, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";

type Props = {
  controller: AppUpdateController;
};

function formatProgress(fraction: number) {
  return `${Math.min(100, Math.max(0, Math.round(fraction * 100)))}%`;
}

export function AppUpdateModal({ controller }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildAppUpdateModalStyles);
  const { visible, info, phase, progress, error, localVersion, startDownload, dismiss } = controller;

  if (!visible || !info) return null;

  const downloading = phase === "downloading" || phase === "installing";
  const progressLabel =
    phase === "installing"
      ? t("appUpdate.installing")
      : progress
        ? t("appUpdate.downloadProgress", { percent: formatProgress(progress.fraction) })
        : t("appUpdate.downloading");

  return (
    <Modal visible transparent animationType="fade" onRequestClose={info.forceUpdate ? undefined : dismiss}>
      <View style={styles.mask}>
        <View style={styles.card} accessibilityRole="alert">
          <Text style={styles.title}>{t("appUpdate.title")}</Text>
          <Text style={styles.subtitle}>
            {t("appUpdate.versionLine", {
              current: localVersion.versionName,
              latest: info.versionName,
            })}
          </Text>
          {info.releaseNotes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesTitle}>{t("appUpdate.releaseNotes")}</Text>
              <Text style={styles.notesBody}>{info.releaseNotes}</Text>
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {downloading ? <Text style={styles.progress}>{progressLabel}</Text> : null}
          <View style={styles.actions}>
            <PrimaryButton
              label={downloading ? progressLabel : t("appUpdate.downloadAndInstall")}
              loading={downloading}
              disabled={downloading}
              onPress={() => void startDownload()}
            />
            {!info.forceUpdate ? (
              <Pressable
                style={({ pressed }) => [styles.laterBtn, pressed ? styles.pressed : null]}
                onPress={dismiss}
                disabled={downloading}
                accessibilityRole="button"
                accessibilityLabel={t("appUpdate.later")}
              >
                <Text style={styles.laterText}>{t("appUpdate.later")}</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.hint}>{t("appUpdate.installHint")}</Text>
        </View>
      </View>
    </Modal>
  );
}

function buildAppUpdateModalStyles(colors: ThemeColors) {
  return StyleSheet.create({
    mask: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xl,
    },
    card: {
      width: "100%",
      maxWidth: 360,
      backgroundColor: colors.bgCard,
      borderRadius: radius.xl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
    },
    title: {
      fontSize: typography.h4,
      fontWeight: "800",
      color: colors.textPrimary,
      textAlign: "center",
    },
    subtitle: {
      marginTop: spacing.sm,
      fontSize: typography.caption,
      color: colors.textSecondary,
      textAlign: "center",
    },
    notesBox: {
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.bgPage,
    },
    notesTitle: {
      fontSize: typography.caption,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    notesBody: {
      fontSize: typography.caption,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    error: {
      marginTop: spacing.sm,
      color: colors.danger,
      fontSize: typography.caption,
      textAlign: "center",
    },
    progress: {
      marginTop: spacing.sm,
      color: colors.brand,
      fontSize: typography.caption,
      textAlign: "center",
      fontWeight: "700",
    },
    actions: {
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    laterBtn: {
      alignItems: "center",
      paddingVertical: spacing.sm,
    },
    laterText: {
      color: colors.textMuted,
      fontSize: typography.caption,
      fontWeight: "600",
    },
    pressed: { opacity: 0.85 },
    hint: {
      marginTop: spacing.md,
      fontSize: typography.micro,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 18,
    },
  });
}
