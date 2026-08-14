import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppGradient } from "../ui/AppGradient";
import { HomeBannerCarousel } from "./HomeBannerCarousel";
import { HomePageHeader } from "./HomePageHeader";
import { HomeTrustBadges } from "./HomeTrustBadges";
import { HotPoolCarousel } from "./HotPoolCarousel";
import { RecommendCarousel } from "./RecommendCarousel";
import { PendingPaymentBanner } from "../PendingPaymentBanner";
import { SectionHeading } from "../ui/SectionHeading";
import { dedupeHotBoxes } from "../../utils/boxDisplay";
import { font, radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
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
  tickerItems: { text: string; qualityType?: string | null }[];
  homeSummary: HomeSummary | null;
  recommendBoxes?: MysteryBox[];
  /** A/B variant for RECOMMEND_IMPRESSION analytics */
  recommendVariant?: string;
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
  onHomeTabChange: (key: string) => void;
  onSortPress: (key: SortKey) => void;
};

const SORT_OPTIONS: { key: SortKey; labelKey: string }[] = [
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
    recommendVariant,
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
    onHomeTabChange,
    onSortPress,
  } = props;

  return (
    <View style={styles.headerWrap}>
      {/* 1–3: first viewport — brand + sub + search, pending, full-bleed banner */}
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

      {/* Below fold: Hot rail (+ Recommend). */}
      {homeSummary?.hotBoxes?.length ? (
        <HotPoolCarousel boxes={dedupeHotBoxes(homeSummary.hotBoxes)} onOpenBox={onOpenBox} />
      ) : null}
      {recommendBoxes.length > 0 ? (
        <RecommendCarousel boxes={recommendBoxes} variant={recommendVariant} onOpenBox={onOpenBox} />
      ) : null}

      {/* Category tabs + sort — FlatList catalog items follow this header */}
      <SectionHeading
        title={t("home.hotSaleTitle")}
        subtitle={t("common.sectionHotSale")}
        accent={themeColors.brand}
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
                <AppGradient colors={[themeColors.brandDark, themeColors.brand]} style={styles.tabBtnActive}>
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
    tabRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md, paddingRight: spacing.lg },
    tabBtnWrap: { minWidth: 88 },
    tabBtn: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.bgSoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabBtnActive: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.md,
      borderRadius: radius.md,
    },
    tabText: {
      ...font("bodyMedium"),
      fontSize: typography.caption,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    tabTextActive: {
      ...font("bodySemiBold"),
      fontSize: typography.caption,
      fontWeight: "800",
      color: colors.textOnBrand,
    },
    sortRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginBottom: spacing.md },
    sortItem: { paddingVertical: spacing.xs },
    sortText: {
      ...font("body"),
      fontSize: typography.caption,
      color: colors.textMuted,
      fontWeight: "600",
    },
    sortTextActive: { color: colors.brandText, fontWeight: "800" },
    resultMeta: {
      ...font("body"),
      marginStart: "auto",
      fontSize: typography.micro,
      color: colors.textMuted,
      fontWeight: "600",
    },
  });
}
