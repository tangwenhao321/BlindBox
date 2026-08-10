import { describe, expect, it, vi } from "vitest";
import { buildActivityDetailProps, buildBalanceLogsViewProps } from "./buildShellSubPageProps";

describe("buildShellSubPageProps", () => {
  it("buildBalanceLogsViewProps wires wallet callbacks", () => {
    const loadBalanceLogs = vi.fn();
    const goBack = vi.fn();
    const props = buildBalanceLogsViewProps({
      token: "tok-1",
      balanceLogs: [],
      balanceLogsLoading: false,
      balanceLogsLoadError: null,
      loadBalanceLogs,
      goBack,
    });
    props.onRetryLoad();
    props.onRefresh();
    props.onBack();
    expect(loadBalanceLogs).toHaveBeenCalledWith("tok-1");
    expect(goBack).toHaveBeenCalled();
  });

  it("buildActivityDetailProps dedupes catalog boxes", () => {
    const box = { id: "b1", name: "Box" } as import("../../types").MysteryBox;
    const props = buildActivityDetailProps({
      selectedActivity: null,
      boxes: [box],
      mallBoxes: [box],
    });
    expect(props.catalogBoxes).toHaveLength(1);
  });
});
