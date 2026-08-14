import { dedupeMysteryBoxes } from "../../utils/boxDisplay";
import type { MysteryBoxActivity } from "../../services/activityService";
import type { MysteryBox , UserBalanceLog } from "../../types";

type BalanceLogsSlice = {
  token: string;
  balanceLogs: UserBalanceLog[];
  balanceLogsLoading: boolean;
  balanceLogsLoadError: string | null;
  loadBalanceLogs: (token: string) => Promise<void>;
  goBack: () => void;
};

type ActivityDetailSlice = {
  selectedActivity: MysteryBoxActivity | null;
  boxes: MysteryBox[];
  mallBoxes: MysteryBox[];
};

export function buildBalanceLogsViewProps(input: BalanceLogsSlice) {
  const { token, balanceLogs, balanceLogsLoading, balanceLogsLoadError, loadBalanceLogs, goBack } = input;
  return {
    logs: balanceLogs,
    loading: balanceLogsLoading,
    loadError: balanceLogsLoadError,
    onRetryLoad: () => loadBalanceLogs(token),
    onBack: goBack,
    onRefresh: () => loadBalanceLogs(token),
  };
}

export function buildActivityDetailProps(input: ActivityDetailSlice) {
  return {
    activity: input.selectedActivity,
    catalogBoxes: dedupeMysteryBoxes([...input.boxes, ...input.mallBoxes]),
  };
}
