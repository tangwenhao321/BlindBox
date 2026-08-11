import i18n from "../i18n";
import { submitPityCompensate } from "../services/pityService";
import type { Order } from "../types";
import { invalidateBoxAuxiliaryQueries } from "./invalidateAppQueries";
import { toast } from "./toast";

export const PITY_STOCK_EXHAUSTED = "PITY_STOCK_EXHAUSTED";

export function isPityStockExhaustedError(message: string | null | undefined): boolean {
  return typeof message === "string" && message.includes(PITY_STOCK_EXHAUSTED);
}

export function needsPityCompensate(status: string | null | undefined): boolean {
  const normalized = (status ?? "").trim().toUpperCase();
  return normalized === "PENDING" || normalized === "WAIT";
}

export function resolveOrderBoxId(order: Order | null | undefined): string | null {
  const item = order?.items?.[0];
  const id = item?.mysteryBoxId ?? item?.mysteryBox?.id;
  return id?.trim() || null;
}

function pityCompensateToastMessage(
  choice: string,
  pointsGranted: number,
  serverMessage?: string | null,
): string {
  const normalized = (choice ?? "").trim().toUpperCase();
  if (normalized === "WAIT" || serverMessage === "PITY_COMPENSATE_WAIT_OK") {
    return i18n.t("boxDetails.pityCompensateWaitSuccess");
  }
  if (normalized === "POINTS" || serverMessage === "PITY_COMPENSATE_POINTS_OK") {
    const points = Number.isFinite(pointsGranted) ? pointsGranted : 0;
    return points > 0
      ? i18n.t("boxDetails.pityCompensatePointsSuccess", { points })
      : i18n.t("boxDetails.pityCompensateSuccess");
  }
  return i18n.t("boxDetails.pityCompensateSuccess");
}

export async function applyPityCompensateChoice(
  token: string,
  boxId: string,
  choice: "WAIT" | "POINTS",
): Promise<boolean> {
  const result = await submitPityCompensate(token, boxId, choice);
  if (!result) {
    toast.error(i18n.t("boxDetails.pityCompensateFailed"));
    return false;
  }
  toast.success(
    pityCompensateToastMessage(result.choice, Number(result.pointsGranted ?? 0), result.message),
  );
  invalidateBoxAuxiliaryQueries(token, boxId);
  return true;
}
