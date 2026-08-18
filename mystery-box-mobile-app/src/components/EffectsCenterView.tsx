import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SubPageHeader } from "./ui/SubPageHeader";
import { ScreenScaffold } from "./ui/ScreenScaffold";
import { EmptyState } from "./EmptyState";
import { ListSkeleton } from "./ListSkeleton";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { spacing, typography, radius } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import {
  UNLOCKABLE_THEME_CATALOG,
  effectiveUnlockedKeys,
  isTestAppVariant,
  loadEquippedThemeId,
  loadOfficialRulesPreview,
  loadThemeUnlockState,
  setEquippedThemeId,
  setOfficialRulesPreview,
  type ThemeUnlockState,
  type UnlockableThemeKey,
} from "../effects/revealThemeRotation";
import { toast } from "../utils/toast";
import { StoryboardPreviewHost } from "./ui/StoryboardPreviewHost";

type Props = {
  onBack: () => void;
};

export function EffectsCenterView({ onBack }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildStyles);
  const [unlocks, setUnlocks] = useState<ThemeUnlockState | null>(null);
  const [equipped, setEquipped] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<UnlockableThemeKey | null>(null);
  const [officialPreview, setOfficialPreview] = useState(false);
  const showOfficialToggle = isTestAppVariant();

  const reload = useCallback(async () => {
    const [state, eq, preview] = await Promise.all([
      loadThemeUnlockState(),
      loadEquippedThemeId(),
      loadOfficialRulesPreview(),
    ]);
    setUnlocks(state);
    setEquipped(eq);
    setOfficialPreview(preview);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const unlocked = new Set(
    unlocks ? effectiveUnlockedKeys(unlocks, { grantTestThemes: showOfficialToggle && !officialPreview }) : ["classic", "asmr"],
  );

  return (
    <View style={styles.root}>
      <SubPageHeader title={t("effectsCenter.title")} onBack={onBack} />
      <ScreenScaffold>
        <Text style={styles.hint}>{t("effectsCenter.hint")}</Text>
        {showOfficialToggle ? (
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={styles.name}>{t("effectsCenter.officialPreview")}</Text>
              <Text style={styles.meta}>{t("effectsCenter.officialPreviewHint")}</Text>
            </View>
            <Switch
              value={officialPreview}
              onValueChange={(next) => {
                void setOfficialRulesPreview(next).then(() => setOfficialPreview(next));
              }}
              accessibilityLabel={t("effectsCenter.officialPreview")}
            />
          </View>
        ) : null}
        {unlocks ? (
          <Text style={styles.progress}>
            {t("effectsCenter.progressOpens", { count: unlocks.openCount })}
            {"\n"}
            {unlocks.hasHidden ? t("effectsCenter.unlocked") : t("effectsCenter.progressHidden")}
            {" · "}
            {unlocks.seriesComplete ? t("effectsCenter.unlocked") : t("effectsCenter.progressSeries")}
          </Text>
        ) : null}
        {unlocks === null ? (
          <ListSkeleton variant="row" rows={4} />
        ) : UNLOCKABLE_THEME_CATALOG.length === 0 ? (
          <EmptyState
            title={t("effectsCenter.emptyTitle")}
            description={t("effectsCenter.emptyDesc")}
            variant="plain"
            icon="✦"
            actionLabel={t("common.retry")}
            onAction={() => void reload()}
          />
        ) : (
          UNLOCKABLE_THEME_CATALOG.map((item) => {
            const isUnlocked = unlocked.has(item.key);
            const isEquipped = equipped === item.remoteAlias || equipped === item.themeId;
            return (
              <View key={item.key} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.name}>{t(`effectsCenter.theme_${item.key}`)}</Text>
                  <Text style={styles.meta}>
                    {isUnlocked
                      ? isEquipped
                        ? t("effectsCenter.equipped")
                        : t("effectsCenter.unlocked")
                      : t("effectsCenter.locked")}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    style={({ pressed }) => [styles.chip, pressed ? styles.pressed : null]}
                    onPress={() => setPreviewKey(item.key)}
                    accessibilityRole="button"
                    accessibilityLabel={t("effectsCenter.preview")}
                  >
                    <Text style={styles.chipText}>{t("effectsCenter.preview")}</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.chip,
                      styles.chipPrimary,
                      (!isUnlocked || isEquipped) && styles.chipDisabled,
                      pressed ? styles.pressed : null,
                    ]}
                    disabled={!isUnlocked || isEquipped}
                    onPress={() => {
                      void setEquippedThemeId(item.remoteAlias).then(() => {
                        setEquipped(item.remoteAlias);
                        toast.success(t("effectsCenter.equipDone", { name: t(`effectsCenter.theme_${item.key}`) }));
                      });
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t("effectsCenter.equip")}
                  >
                    <Text style={[styles.chipText, styles.chipPrimaryText]}>
                      {isEquipped ? t("effectsCenter.equipped") : t("effectsCenter.equip")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
        {previewKey ? <StoryboardPreviewHost themeKey={previewKey} onClose={() => setPreviewKey(null)} /> : null}
      </ScreenScaffold>
    </View>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgPage },
    hint: {
      color: colors.textMuted,
      fontSize: typography.caption,
      marginBottom: spacing.sm,
    },
    progress: {
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 20,
      marginBottom: spacing.md,
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.bgCard,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    toggleText: { flex: 1, gap: 4 },
    row: {
      borderRadius: radius.md,
      backgroundColor: colors.bgCard,
      padding: spacing.md,
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    rowText: { gap: 4 },
    name: { color: colors.textPrimary, fontSize: typography.body, fontWeight: "800" },
    meta: { color: colors.textMuted, fontSize: typography.caption, fontWeight: "600" },
    actions: { flexDirection: "row", gap: spacing.sm },
    chip: {
      borderRadius: radius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
    },
    chipPrimary: { backgroundColor: colors.brand, borderColor: colors.brand },
    chipDisabled: { opacity: 0.45 },
    chipText: { color: colors.textPrimary, fontSize: typography.caption, fontWeight: "700" },
    chipPrimaryText: { color: "#fff" },
    pressed: { opacity: 0.85 },
  });
}
