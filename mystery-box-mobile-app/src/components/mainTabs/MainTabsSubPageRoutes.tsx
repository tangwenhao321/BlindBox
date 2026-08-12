import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { BoxDetailsView } from "../BoxDetailsView";
import { ListSkeleton } from "../ListSkeleton";
import { useMainTabsShellViewState } from "../../hooks/useMainTabsViewSlices";
import { ErrorBoundary } from "../ErrorBoundary";
import { OrderDetailsView } from "../OrderDetailsView";
import { CouponsView } from "../CouponsView";
import { CurrencyExplainView } from "../CurrencyExplainView";
import { InfoPageView } from "../InfoPageView";
import { BalanceLogsView } from "../BalanceLogsView";
import { AddressManageView } from "../AddressManageView";
import { AddressFormView } from "../AddressFormView";
import { MessageCenterView } from "../MessageCenterView";
import { FeedbackView } from "../FeedbackView";
import { SettingsView } from "../SettingsView";
import { MyOrdersView } from "../MyOrdersView";
import { PromotionView } from "../PromotionView";
import { CommissionDetailsView } from "../CommissionDetailsView";
import { TeamView } from "../TeamView";
import { TeamLotteryView } from "../TeamLotteryView";
import { InviteCenterView } from "../InviteCenterView";
import { IpThemeView } from "../IpThemeView";
import { EffectsCenterView } from "../EffectsCenterView";
import { VipBenefitsView } from "../VipBenefitsView";
import { ProbabilityDisclosureView } from "../ProbabilityDisclosureView";
import { ExchangeMallView } from "../ExchangeMallView";
import { LeaderboardView } from "../LeaderboardView";
import { CommunityView } from "../CommunityView";
import { MarketplaceView } from "../MarketplaceView";
import { MarketplaceChatView } from "../MarketplaceChatView";
import { peekMarketplaceChatParams } from "../../navigation/marketplaceChatParams";
import { CatalogSearchView } from "../CatalogSearchView";
import { RefundsView } from "../RefundsView";
import { ShipRequestsView } from "../ShipRequestsView";
import { FairnessVerifyView } from "../FairnessVerifyView";
import { PaymentReturnView } from "../PaymentReturnView";
import { RevealSpectatorScreen } from "../RevealSpectatorScreen";
import { clearSpectatorToken, peekSpectatorToken } from "../../navigation/spectatorParams";
import { useAuthToken } from "../../hooks/useAuthToken";
import { ActivityDetailView } from "../ActivityDetailView";
import { FavoritesView } from "../FavoritesView";
import { EmptyState } from "../EmptyState";
import { WelfareSubPage } from "./WelfareSubPage";
import { useTranslation } from "react-i18next";
import type { AppView } from "./appViews";
import {
  useActivityDetailScreenProps,
  useAddressFormScreenProps,
  useAddressManageScreenProps,
  useBalanceLogsScreenProps,
  useBoxDetailsScreenProps,
  useCatalogSearchScreenProps,
  useCommissionScreenProps,
  useCommunityScreenProps,
  useCouponsScreenProps,
  useCurrencyExplainScreenProps,
  useExchangeMallScreenProps,
  useFairnessVerifyScreenProps,
  useFavoritesScreenProps,
  useFeedbackScreenProps,
  useGoBackScreenProps,
  useIpThemeScreenProps,
  useLeaderboardScreenProps,
  useMarketplaceScreenProps,
  useMessageCenterScreenProps,
  useMyOrdersScreenProps,
  useOrderDetailsScreenProps,
  usePaymentReturnScreenProps,
  usePlayGuideScreenProps,
  usePrivacyScreenProps,
  useTermsOfServiceScreenProps,
  useMinorDeclarationScreenProps,
  useProbabilityScreenProps,
  useRefundsScreenProps,
  useSettingsScreenProps,
  useShipRequestsScreenProps,
  useWelfareScreenProps,
} from "../../hooks/useMainTabsSubPageScreenProps";

function CatalogSearchRoute() {
  const props = useCatalogSearchScreenProps();
  return <CatalogSearchView {...props} />;
}

function PlayGuideRoute() {
  const props = usePlayGuideScreenProps();
  return <InfoPageView {...props} />;
}

function ShipRequestsRoute() {
  const props = useShipRequestsScreenProps();
  return <ShipRequestsView {...props} />;
}

function WelfareRoute() {
  const props = useWelfareScreenProps();
  return <WelfareSubPage {...props} />;
}

function FavoritesRoute() {
  const props = useFavoritesScreenProps();
  return <FavoritesView {...props} />;
}

function ProbabilityRoute() {
  const { t } = useTranslation();
  const props = useProbabilityScreenProps();
  if (!props.box) {
    return (
      <View style={missingStyles.wrap}>
        <EmptyState
          title={t("boxDetails.missingTitle", { defaultValue: "暂无盲盒" })}
          description={t("boxDetails.missingDesc", { defaultValue: "请从首页重新进入" })}
          variant="plain"
          actionLabel={t("common.back", { defaultValue: "返回" })}
          onAction={props.onBack}
        />
      </View>
    );
  }
  return <ProbabilityDisclosureView box={props.box} onBack={props.onBack} />;
}

function ExchangeMallRoute() {
  const props = useExchangeMallScreenProps();
  return <ExchangeMallView {...props} />;
}

function LeaderboardRoute() {
  const props = useLeaderboardScreenProps();
  return <LeaderboardView {...props} />;
}

function CommunityRoute() {
  const props = useCommunityScreenProps();
  return <CommunityView {...props} />;
}

function MarketplaceRoute() {
  const props = useMarketplaceScreenProps();
  return <MarketplaceView {...props} />;
}

function MarketplaceChatRoute() {
  const { goBack } = useMainTabsShellViewState();
  const params = peekMarketplaceChatParams();
  return (
    <MarketplaceChatView
      listingId={params?.listingId}
      listingTitle={params?.listingTitle}
      onBack={goBack}
    />
  );
}

function RefundsRoute() {
  const props = useRefundsScreenProps();
  return <RefundsView {...props} />;
}

function ActivityDetailRoute() {
  const { t } = useTranslation();
  const props = useActivityDetailScreenProps();
  if (!props.activity) {
    return (
      <View style={missingStyles.wrap}>
        <EmptyState
          title={t("activity.missingTitle", { defaultValue: "活动不存在" })}
          description={t("activity.missingDesc", { defaultValue: "请返回活动列表重试" })}
          variant="plain"
          actionLabel={t("common.back", { defaultValue: "返回" })}
          onAction={props.onBack}
        />
      </View>
    );
  }
  return (
    <ActivityDetailView
      activity={props.activity}
      catalogBoxes={props.catalogBoxes}
      onBack={props.onBack}
      onOpenBox={props.onOpenBox}
    />
  );
}

function BoxDetailsRoute({ offline }: { offline: boolean }) {
  const { t } = useTranslation();
  const goBackProps = useGoBackScreenProps();
  const props = useBoxDetailsScreenProps(offline);
  if (!props.activeBox) {
    return (
      <View style={missingStyles.wrap}>
        <EmptyState
          title={t("boxDetails.missingTitle", { defaultValue: "暂无盲盒" })}
          description={t("boxDetails.missingDesc", { defaultValue: "请从首页重新进入" })}
          variant="plain"
          actionLabel={t("common.back", { defaultValue: "返回" })}
          onAction={goBackProps.onBack}
        />
      </View>
    );
  }
  return (
    <ErrorBoundary onReset={goBackProps.onBack}>
      <BoxDetailsView {...props} activeBox={props.activeBox} />
    </ErrorBoundary>
  );
}

function CouponsRoute() {
  const props = useCouponsScreenProps();
  return <CouponsView {...props} />;
}

function LuckyCoinsRoute() {
  const props = useCurrencyExplainScreenProps("luckyCoins");
  return <CurrencyExplainView {...props} />;
}

function StarStonesRoute() {
  const props = useCurrencyExplainScreenProps("starStones");
  return <CurrencyExplainView {...props} />;
}

function PrivacyRoute() {
  const props = usePrivacyScreenProps();
  return <InfoPageView {...props} />;
}

function TermsOfServiceRoute() {
  const props = useTermsOfServiceScreenProps();
  return <InfoPageView {...props} />;
}

function MinorDeclarationRoute() {
  const props = useMinorDeclarationScreenProps();
  return <InfoPageView {...props} />;
}

function LevelGiftRoute() {
  const { goBack, onOpenLogin } = useMainTabsShellViewState();
  return <VipBenefitsView onBack={goBack} onRequireLogin={onOpenLogin} />;
}

function InviteCenterRoute() {
  const { goBack, onOpenLogin } = useMainTabsShellViewState();
  return <InviteCenterView onBack={goBack} onRequireLogin={onOpenLogin} />;
}

function IpThemeRoute() {
  const props = useIpThemeScreenProps();
  return <IpThemeView {...props} />;
}

function EffectsCenterRoute() {
  const props = useGoBackScreenProps();
  return <EffectsCenterView {...props} />;
}

function BalanceLogsRoute() {
  const props = useBalanceLogsScreenProps();
  return <BalanceLogsView {...props} />;
}

function AddressManageRoute() {
  const props = useAddressManageScreenProps();
  return <AddressManageView {...props} />;
}

function MessagesRoute() {
  const props = useMessageCenterScreenProps();
  return <MessageCenterView {...props} />;
}

function FeedbackRoute() {
  const props = useFeedbackScreenProps();
  return <FeedbackView {...props} />;
}

function SettingsRoute() {
  const props = useSettingsScreenProps();
  return <SettingsView {...props} />;
}

function OrderDetailsRoute() {
  const { t } = useTranslation();
  const { pageLoading, goBack } = useMainTabsShellViewState();
  const props = useOrderDetailsScreenProps();
  if (!props.order) {
    if (pageLoading) {
      return (
        <View style={orderDetailsLoadingStyles.wrap}>
          <ListSkeleton variant="row" rows={6} />
        </View>
      );
    }
    return (
      <View style={missingStyles.wrap}>
        <EmptyState
          title={t("orders.missingTitle", { defaultValue: "订单不存在" })}
          description={t("orders.missingDesc", { defaultValue: "请返回订单列表重试" })}
          variant="plain"
          actionLabel={t("common.back", { defaultValue: "返回" })}
          onAction={props.onBack ?? goBack}
        />
      </View>
    );
  }
  return <OrderDetailsView {...props} order={props.order} />;
}

const orderDetailsLoadingStyles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 16 },
});

const missingStyles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: 24 },
});

function SpectatorRoute() {
  const token = peekSpectatorToken() ?? "";
  const authToken = useAuthToken();
  useEffect(() => () => clearSpectatorToken(), []);
  return <RevealSpectatorScreen token={token} authToken={authToken} />;
}

function PaymentReturnRoute() {
  const { t } = useTranslation();
  const { goBack } = useMainTabsShellViewState();
  const props = usePaymentReturnScreenProps();
  if (!props.orderId) {
    return (
      <View style={missingStyles.wrap}>
        <EmptyState
          title={t("paymentReturn.missingTitle", { defaultValue: "无支付回跳订单" })}
          description={t("paymentReturn.missingDesc", { defaultValue: "请从订单页重新进入" })}
          variant="plain"
          actionLabel={t("common.back", { defaultValue: "返回" })}
          onAction={goBack}
        />
      </View>
    );
  }
  return <PaymentReturnView {...props} />;
}

function FairnessVerifyRoute() {
  const props = useFairnessVerifyScreenProps();
  if (!props.orderId) {
    return (
      <FairnessVerifyView
        orderId=""
        onBack={props.onBack}
        missingOrder
      />
    );
  }
  return (
    <FairnessVerifyView
      orderId={props.orderId}
      mysteryBoxId={props.mysteryBoxId}
      onBack={props.onBack}
    />
  );
}

function OrdersRoute() {
  const props = useMyOrdersScreenProps();
  return <MyOrdersView {...props} />;
}

function PromotionRoute() {
  const props = useGoBackScreenProps();
  return <PromotionView {...props} />;
}

function CommissionRoute() {
  const props = useCommissionScreenProps();
  return <CommissionDetailsView {...props} />;
}

function TeamRoute() {
  const { goBack, setView, onOpenLogin } = useMainTabsShellViewState();
  return (
    <TeamView
      onBack={goBack}
      onOpenTeamLottery={() => setView("teamLottery")}
      onRequireLogin={onOpenLogin}
    />
  );
}

function TeamLotteryRoute() {
  const { goBack, onOpenLogin } = useMainTabsShellViewState();
  return <TeamLotteryView onBack={goBack} onRequireLogin={onOpenLogin} />;
}

function AddressFormRoute() {
  const props = useAddressFormScreenProps();
  return <AddressFormView {...props} />;
}

export type MainTabsSubPageRoutesProps = {
  view: AppView;
  offline: boolean;
};

/** Renders one sub-page; hooks run only inside the matched route component. */
export function MainTabsSubPageRoutes({ view, offline }: MainTabsSubPageRoutesProps) {
  switch (view) {
    case "catalogSearch":
      return <CatalogSearchRoute />;
    case "playGuide":
      return <PlayGuideRoute />;
    case "shipRequests":
      return <ShipRequestsRoute />;
    case "welfare":
      return <WelfareRoute />;
    case "favorites":
      return <FavoritesRoute />;
    case "probability":
      return <ProbabilityRoute />;
    case "exchangeMall":
      return <ExchangeMallRoute />;
    case "leaderboard":
      return <LeaderboardRoute />;
    case "community":
      return <CommunityRoute />;
    case "marketplace":
      return <MarketplaceRoute />;
    case "marketplaceChat":
      return <MarketplaceChatRoute />;
    case "refunds":
      return <RefundsRoute />;
    case "activityDetail":
      return <ActivityDetailRoute />;
    case "boxDetails":
      return <BoxDetailsRoute offline={offline} />;
    case "coupons":
      return <CouponsRoute />;
    case "luckyCoins":
      return <LuckyCoinsRoute />;
    case "starStones":
      return <StarStonesRoute />;
    case "privacy":
      return <PrivacyRoute />;
    case "termsOfService":
      return <TermsOfServiceRoute />;
    case "minorDeclaration":
      return <MinorDeclarationRoute />;
    case "levelGift":
      return <LevelGiftRoute />;
    case "inviteCenter":
      return <InviteCenterRoute />;
    case "ipTheme":
      return <IpThemeRoute />;
    case "effectsCenter":
      return <EffectsCenterRoute />;
    case "balanceLogs":
      return <BalanceLogsRoute />;
    case "addressManage":
      return <AddressManageRoute />;
    case "messages":
      return <MessagesRoute />;
    case "feedback":
      return <FeedbackRoute />;
    case "settings":
      return <SettingsRoute />;
    case "orderDetails":
      return <OrderDetailsRoute />;
    case "fairnessVerify":
      return <FairnessVerifyRoute />;
    case "orders":
      return <OrdersRoute />;
    case "promotion":
      return <PromotionRoute />;
    case "commission":
      return <CommissionRoute />;
    case "team":
      return <TeamRoute />;
    case "teamLottery":
      return <TeamLotteryRoute />;
    case "addressForm":
      return <AddressFormRoute />;
    case "paymentReturn":
      return <PaymentReturnRoute />;
    case "revealSpectator":
      return <SpectatorRoute />;
    default:
      return null;
  }
}
