import type { buildAccountViewProps } from "./buildAccountViewProps";
import type { buildBoxViewProps } from "./buildBoxViewProps";
import type { buildOrderViewProps } from "./buildOrderViewProps";
import type { buildActivityDetailProps, buildBalanceLogsViewProps } from "./buildShellSubPageProps";

/** Prop slices inferred from builders — single source of truth for MainTabs view props. */
export type BoxViewProps = ReturnType<typeof buildBoxViewProps>;
export type OrderViewProps = ReturnType<typeof buildOrderViewProps>;
export type AccountViewPropsBundle = ReturnType<typeof buildAccountViewProps>;
export type ProfileViewProps = AccountViewPropsBundle["profileViewProps"];
export type SettingsViewProps = AccountViewPropsBundle["settingsViewProps"];
export type MessageViewProps = AccountViewPropsBundle["messageViewProps"];
export type FeedbackViewProps = AccountViewPropsBundle["feedbackViewProps"];
export type FeatureViewProps = AccountViewPropsBundle["featureViewProps"];
export type AddressFormViewProps = AccountViewPropsBundle["addressFormViewProps"];
export type BalanceLogsViewProps = ReturnType<typeof buildBalanceLogsViewProps>;
export type ActivityDetailProps = ReturnType<typeof buildActivityDetailProps>;
