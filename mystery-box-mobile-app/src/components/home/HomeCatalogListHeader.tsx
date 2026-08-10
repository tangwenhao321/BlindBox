import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppGradient } from "../ui/AppGradient";
import { HomeBannerCarousel } from "./HomeBannerCarousel";
import { HomeFeatureGrid } from "./HomeFeatureGrid";
import { HomePageHeader } from "./HomePageHeader";
import { HomeStatsBar } from "./HomeStatsBar";
import { HomeTrustBadges } from "./HomeTrustBadges";
import { HotPoolCarousel } from "./HotPoolCarousel";
import { RecommendCarousel } from "./RecommendCarousel";
import { PendingPaymentBanner } from "../PendingPaymentBanner";
import { SectionHeading } from "../ui/SectionHeading";
import { dedupeHotBoxes } from "../../utils/boxDisplay";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import type { MysteryBoxActivity } from "../../services/activityService";
import type { HomeSummary } from "../../services/homeService";
import type { Order, MysteryBox } from "../../types";

type HomeTab = { key: string; label: string; kind: "all" | "category" | "pity"; categoryId?: string };

type BannerSlide = {
  uri?: string;
  title: string;
  subtitle: string;
  cta: string;
};

type SortKey = "new" | "sales" | "price";

type Props = {
  token?: string;
  orders: Order[];
  bannerSlides: BannerSlide[];
  tickerItems: Array<{ text: string; qualityType?: string | null }>;
  homeSummary: HomeSummary | null;
  recommendBoxes?: MysteryBox[];
  activities: MysteryBoxActivity[];
  homeTabs: HomeTab[];
  homeTabKey: string;
  sortKey: SortKey;
  priceAsc: boolean;
  filteredCount: number;
  themeColors: ThemeColors;
  onPressSearch?: () => void;
  onContactSupport?: () => void;
  onContinuePendingPayment?: (orderId: string) => void;
  onViewAllPending?: () => void;
  onPressBannerSlide: (index: number) => void;
  onPressTicker: () => void;
  onOpenProbabilityDisclosure?: () => void;
  onOpenPlayGuide?: () => void;
  onOpenBox: (id: string) => void;
  onOpenActivity?: (activity: MysteryBoxActivity) => void;
  onOpenFeature?: (title: string) => void;
  onGoMall?: () => void;
  onGoMallSearch?: (keyword: string) => void;
  onHomeTabChange: (key: string) => void;
  onSortPress: (key: SortKey) => void;
};

const SORT_OPTIONS: Array<{ key: SortKey; labelKey: string }> = [
  { key: "new", labelKey: "home.sortNew" },
  { key: "sales", labelKey: "home.sortPopularity" },
  { key: "price", labelKey: "home.sortPrice" },
];

export function HomeCatalogListHeader(props: Props) {
  const { t } = useTranslation();
  const styles = buildHomeCatalogListHeaderStyles(props.themeColors);
  const {
    token,
    orders,
    bannerSlides,
    tickerItems,
    homeSummary,
    recommendBoxes = [],
    activities,
    homeTabs,
    homeTabKey,
    sortKey,
    priceAsc,
    filteredCount,
    themeColors,
    onPressSearch,
    onContactSupport,
    onContinuePendingPayment,
    onViewAllPending,
    onPressBannerSlide,
    onPressTicker,
    onOpenProbabilityDisclosure,
    onOpenPlayGuide,
    onOpenBox,
    onOpenActivity,
    onOpenFeature,
    onGoMall,
    onGoMallSearch,
    onHomeTabChange,
    onSortPress,
  } = props;

  return (
    <View style={styles.headerWrap}>
      <HomePageHeader onPressSearch={onPressSearch} onContactSupport={onContactSupport} />
      {onContinuePendingPayment ? (
        <PendingPaymentBanner
          orders={orders}
          authToken={token}
          onContinue={onContinuePendingPayment}
          onViewAllPending={onViewAllPending}
        />
      ) : null}
      <HomeBannerCarousel
        slides={bannerSlides}
        tickerItems={tickerItems}
        onPressSlide={onPressBannerSlide}
        onPressTicker={onPressTicker}
      />
      <HomeTrustBadges onPressProbability={onOpenProbabilityDisclosure} onPressPlayGuide={onOpenPlayGuide} />
      {homeSummary ? (
        <HomeStatsBar
          todayDrawCount={homeSummary.todayDrawCount}
          todayLegendaryCount={homeSummary.todayLegendaryCount}
        />
      ) : null}
      {homeSummary?.hotBoxes?.length ? (
        <HotPoolCarousel boxes={dedupeHotBoxes(homeSummary.hotBoxes)} onOpenBox={onOpenBox} />
      ) : null}
      {recommendBoxes.length > 0 ? <RecommendCarousel boxes={recommendBoxes} onOpenBox={onOpenBox} /> : null}
      {activities.length > 0 && onOpenActivity ? (
        <View style={styles.activityBlock}>
          <Text style={styles.activityTitle}>{t("home.limitedActivity")}</Text>
          {activities.slice(0, 3).map((act) => {
            const diff = new Date(act.endTime).getTime() - Date.now();
            const countdown =
              diff <= 0
                ? t("home.activityEnded")
                : `${Math.floor(diff / 3600000)}:${String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0")}:${String(Math.floor((diff % 60000) / 1000)).padStart(2, "0")}`;
            return (
              <Pressable
                key={act.id}
                style={styles.activityCard}
                onPress={() => onOpenActivity(act)}
                accessibilityRole="button"
                accessibilityLabel={act.title}
              >
                <Text style={styles.activityName}>{act.title}</Text>
                <Text style={styles.activityEnd}>{t("home.activityRemaining", { countdown })}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {onOpenFeature && onGoMall ? (
        <HomeFeatureGrid onOpenFeature={onOpenFeature} onGoMall={onGoMall} onGoMallSearch={onGoMallSearch} />
      ) : null}
      <SectionHeading
        title={t("home.hotSaleTitle")}
        subtitle={t("common.sectionHotSale")}
        accent={themeColors.accentOrange}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
        {homeTabs.map((tab) => {
          const active = homeTabKey === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onHomeTabChange(tab.key)}
              style={styles.tabBtnWrap}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
            >
              {active ? (
                <AppGradient colors={[themeColors.accentOrange, themeColors.profilePink]} style={styles.tabBtnActive}>
                  <Text style={styles.tabTextActive}>{tab.label}</Text>
                </AppGradient>
              ) : (
                <View style={styles.tabBtn}>
                  <Text style={styles.tabText}>{tab.label}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt) => {
          const active = sortKey === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => onSortPress(opt.key)}
              style={styles.sortItem}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t(opt.labelKey)}
            >
              <Text style={[styles.sortText, active ? styles.sortTextActive : null]}>
                {t(opt.labelKey)}
                {opt.key === "price" && active ? (priceAsc ? " ↑" : " ↓") : ""}
              </Text>
            </Pressable>
          );
        })}
        <Text style={styles.resultMeta}>{t("home.resultCount", { count: filteredCount })}</Text>
      </View>
    </View>
  );
}

function buildHomeCatalogListHeaderStyles(colors: ThemeColors) {
  return StyleSheet.create({
    headerWrap: { marginBottom: spacing.sm, backgroundColor: colors.bgPage },
    activityBlock: { marginBottom: spacing.md, gap: spacing.sm },
    activityTitle: { fontWeight: "900", fontSize: typography.bodyLg, color: colors.textPrimary },
    activityCard: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    activityName: { fontWeight: "800", color: colors.textPrimary },
    activityEnd: { marginTop: 4, fontSize: typography.micro, color: colors.textMuted },
    tabRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md, paddingRight: spacing.lg },
    tabBtnWrap: { minWidth: 88 },
    tabBtn: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabBtnActive: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.md,
      borderRadius: radius.md,
    },
    tabText: { fontSize: typography.caption, fontWeight: "700", color: colors.textSecondary },
    tabTextActive: { fontSize: typography.caption, fontWeight: "900", color: colors.textOnBrand },
    sortRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginBottom: spacing.md },
    sortItem: { paddingVertical: spacing.xs },
    sortText: { fontSize: typography.caption, color: colors.textMuted, fontWeight: "600" },
    sortTextActive: { color: colors.brand, fontWeight: "900" },
    resultMeta: { marginStart: "auto", fontSize: typography.micro, color: colors.textMuted, fontWeight: "600" },
  });
}
