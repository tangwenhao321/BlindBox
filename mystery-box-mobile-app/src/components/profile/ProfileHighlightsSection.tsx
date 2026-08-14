import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { RevealSnapshot } from "../../effects/revealSnapshotCache";
import type { ShareAchievement } from "../../effects/revealShareAchievements";
import { qualityLabelFromRaw } from "../../utils/quality";
import { RemoteImage } from "../ui/RemoteImage";
import { AnimatedRevealCard } from "../AnimatedRevealCard";
import { useAppTheme } from "../../context/ThemeContext";

type Props = {
  loggedIn: boolean;
  recentHighlights: RevealSnapshot[];
  shareAchievements: ShareAchievement[];
  styles: Record<string, object>;
};

export function ProfileHighlightsSection({
  loggedIn,
  recentHighlights,
  shareAchievements,
  styles,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <>
      {loggedIn && recentHighlights.length > 0 ? (
        <AnimatedRevealCard delay={70}>
          <View style={styles.shelfBlock}>
            <Text style={styles.shelfTitle}>{t("profile.recentHighlights")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfRow}>
              {recentHighlights.map((snap) => (
                <View key={`${snap.orderId}:${snap.productId}`} style={styles.shelfCard}>
                  {snap.imageUri ? (
                    <RemoteImage uri={snap.imageUri} style={styles.shelfImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.shelfImage, styles.shelfImagePlaceholder]}>
                      <Ionicons name="diamond-outline" size={28} color={colors.brand} />
                    </View>
                  )}
                  <Text style={styles.shelfName} numberOfLines={1}>
                    {snap.productName ?? t("profile.highlightUnknown")}
                  </Text>
                  <Text style={styles.shelfTier} numberOfLines={1}>
                    {qualityLabelFromRaw(snap.qualityType, t)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </AnimatedRevealCard>
      ) : null}

      {loggedIn && shareAchievements.length > 0 ? (
        <View style={styles.achievementsBlock}>
          <Text style={styles.shelfTitle}>{t("profile.shareAchievements")}</Text>
          {shareAchievements.map((row) => (
            <Text key={row.type} style={styles.shareAchievementRow}>
              {t("profile.shareAchievementRow", { type: row.type })}
            </Text>
          ))}
        </View>
      ) : null}
    </>
  );
}
