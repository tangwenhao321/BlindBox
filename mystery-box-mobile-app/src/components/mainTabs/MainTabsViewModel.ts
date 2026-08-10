import type { TabKey } from "../ui/BottomTabBar";
import type { UserProfile } from "../../types";
import type { AppView } from "./appViews";
import type {
  ActivityDetailProps,
  AddressFormViewProps,
  BalanceLogsViewProps,
  BoxViewProps,
  FeatureViewProps,
  FeedbackViewProps,
  MessageViewProps,
  OrderViewProps,
  ProfileViewProps,
  SettingsViewProps,
} from "../../hooks/mainTabs/mainTabsPropTypes";

/** Shell + tab prop slices assembled for MainTabsView. Builder outputs define box/order/account props. */
export type MainTabsViewModel = {
  view: AppView;
  setView: (value: AppView) => void;
  resetTab: (tab: TabKey) => void;
  goBack: () => void;
  isLoggedIn?: boolean;
  onOpenLogin?: () => void;
  requireAuth?: (action?: () => void) => boolean;
  userProfile: UserProfile | null;
  balanceAmount: number;
  balanceUpdatedAtText: string;
  onRefreshBalance: () => void;
  refreshingBalance: boolean;
  onOpenBalanceLogs: () => void;
  pageLoading: boolean;
  globalErrors: string[];
  onDismissGlobalError: () => void;
  onRetryFromError: () => void;
  unreadMessageCount?: number;
  warehousePendingCount?: number;
  warehousePendingCountApproximate?: boolean;
  onTabFocus?: (tab: TabKey) => void;
  orderBadges: { pendingPay: number; pendingDelivery: number; pendingReceive: number; completed: number };
  boxViewProps: BoxViewProps;
  orderViewProps: OrderViewProps;
  balanceLogsViewProps: BalanceLogsViewProps;
  activityDetailProps?: ActivityDetailProps;
  onOpenActivity?: (activity: NonNullable<ActivityDetailProps["activity"]>) => void;
  catalogSearchInitialKeyword?: string;
  communityDraft?: string;
  openCommunityWithDraft?: (draft: string) => void;
  featureViewProps: FeatureViewProps;
  messageViewProps: MessageViewProps;
  feedbackViewProps: FeedbackViewProps;
  settingsViewProps: SettingsViewProps;
  profileViewProps: ProfileViewProps;
  addressFormViewProps: AddressFormViewProps;
};

export type MainTabsViewProps = MainTabsViewModel;
export type MainTabsComponentProps = MainTabsViewModel;
