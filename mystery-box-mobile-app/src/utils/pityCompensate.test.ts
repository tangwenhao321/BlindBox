import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  applyPityCompensateChoice,
  isPityStockExhaustedError,
  needsPityCompensate,
  resolveOrderBoxId,
} from "./pityCompensate";

vi.mock("../i18n", () => ({
  default: { t: (key: string) => key },
}));

const submitMock = vi.fn();
vi.mock("../services/pityService", () => ({
  submitPityCompensate: (...args: unknown[]) => submitMock(...args),
}));

vi.mock("./invalidateAppQueries", () => ({
  invalidateBoxAuxiliaryQueries: vi.fn(),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("./toast", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

describe("pityCompensate", () => {
  beforeEach(() => {
    submitMock.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it("detects stock exhausted errors", () => {
    expect(isPityStockExhaustedError("PITY_STOCK_EXHAUSTED:保底触发")).toBe(true);
    expect(isPityStockExhaustedError("other")).toBe(false);
  });

  it("needs compensate for PENDING and WAIT", () => {
    expect(needsPityCompensate("PENDING")).toBe(true);
    expect(needsPityCompensate("wait")).toBe(true);
    expect(needsPityCompensate("POINTS")).toBe(false);
  });

  it("resolves order box id", () => {
    expect(resolveOrderBoxId({ id: "o1", status: "x", items: [{ mysteryBoxId: "box-9" }] })).toBe("box-9");
    expect(
      resolveOrderBoxId({ id: "o1", status: "x", items: [{ mysteryBox: { id: "box-8" } }] }),
    ).toBe("box-8");
  });

  it("applies compensate choice and toasts localized success", async () => {
    submitMock.mockResolvedValueOnce({
      choice: "WAIT",
      pointsGranted: 0,
      message: "PITY_COMPENSATE_WAIT_OK",
    });
    await expect(applyPityCompensateChoice("tok", "box-1", "WAIT")).resolves.toBe(true);
    expect(submitMock).toHaveBeenCalledWith("tok", "box-1", "WAIT");
    expect(toastSuccess).toHaveBeenCalledWith("boxDetails.pityCompensateWaitSuccess");
  });

  it("toasts points success with amount", async () => {
    submitMock.mockResolvedValueOnce({
      choice: "POINTS",
      pointsGranted: 120,
      message: "PITY_COMPENSATE_POINTS_OK",
    });
    await expect(applyPityCompensateChoice("tok", "box-1", "POINTS")).resolves.toBe(true);
    expect(toastSuccess).toHaveBeenCalledWith("boxDetails.pityCompensatePointsSuccess");
  });

  it("toasts error when submit fails", async () => {
    submitMock.mockResolvedValueOnce(null);
    await expect(applyPityCompensateChoice("tok", "box-1", "POINTS")).resolves.toBe(false);
    expect(toastError).toHaveBeenCalled();
  });
});
