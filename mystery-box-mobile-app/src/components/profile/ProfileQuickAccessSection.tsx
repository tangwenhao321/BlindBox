import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { FEATURE_KEYS } from "../../config/featureRegistry";
import { useAppTheme } from "../../context/ThemeContext";
import { ProfileGlyph } from "./ProfileGlyph";
import type { VectorIconName } from "./profileConstants";

type QuickItem = {
  key: string;
  labelKey: string;
  featureKey: string;
  iconSet: "ion" | "mci";
  icon: VectorIconName;
};

const QUICK_ITEMS: QuickItem[] = [
  {
    key: "checkIn",
    labelKey: "profile.appCheckIn",
    featureKey: FEATURE_KEYS.CHECK_IN,
    iconSet: "ion",
    icon: "calendar-outline",
  },
  {
    key: "community",
    labelKey: "profile.appCommunity",
    featureKey: FEATURE_KEYS.COMMUNITY,
    iconSet: "ion",
    icon: "chatbubble-ellipses-outline",
  },
  {
    key: "marketplace",
    labelKey: "profile.appMarketplace",
    featureKey: FEATURE_KEYS.MARKETPLACE,
    iconSet: "mci",
    icon: "storefront-outline",
  },
  {
    key: "invite",
    labelKey: "profile.appInviteCenter",
    featureKey: FEATURE_KEYS.INVITE_CENTER,
    iconSet: "ion",
    icon: "share-social-outline",
  },
];

type Props = {
  guard: (action: () => void) => void;
  onOpenFeature: (title: string) => void;
  styles: Record<string, object>;
};

/** Always-visible row for high-frequency destinations (not buried under “更多”). */
export function ProfileQuickAccessSection({ guard, onOpenFeature, styles }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <View style={styles.quickAccessCard}>
      <Text style={styles.quickAccessTitle} accessibilityRole="header">
        {t("profile.quickAccess")}
      </Text>
      <View style={styles.quickAccessRow}>
        {QUICK_ITEMS.map((item) => (
          <Pressable
            key={item.key}
            style={({ pressed }) => [styles.quickAccessCell, pressed ? styles.pressablePressed : null]}
            accessibilityRole="button"
            accessibilityLabel={t(item.labelKey)}
            onPress={() => guard(() => onOpenFeature(item.featureKey))}
          >
            <View style={styles.quickAccessIcon}>
              <ProfileGlyph iconSet={item.iconSet} icon={item.icon} color={colors.brand} size={22} />
            </View>
            <Text style={styles.quickAccessLabel} numberOfLines={1}>
              {t(item.labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
