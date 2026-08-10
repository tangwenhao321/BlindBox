import i18n from "../i18n";
import { formatCurrency } from "./formatCurrency";

export type DrawPackRateConfig = {
  drawCount: number;
  discountRate: number;
  enabled: boolean;
};

export function calcPackPriceFromRates(
  unitPrice: number,
  drawCount: number,
  configs: DrawPackRateConfig[],
) {
  const config = configs.find((c) => c.drawCount === drawCount);
  const rate = config?.discountRate ?? 10000;
  const original = unitPrice * drawCount;
  const price = Math.round(original * rate) / 10000;
  const saved = original - price;
  return { price, original, saved };
}

export function getBestPackTeaserFromRates(unitPrice: number, configs: DrawPackRateConfig[]): string | null {
  if (!configs.length || unitPrice <= 0) return null;
  let best: { count: number; saved: number; perDraw: number } | null = null;
  for (const config of configs) {
    if (!config.enabled || config.drawCount <= 1) continue;
    const pack = calcPackPriceFromRates(unitPrice, config.drawCount, configs);
    if (pack.saved <= 0.01) continue;
    const perDraw = pack.price / config.drawCount;
    if (!best || pack.saved > best.saved) {
      best = { count: config.drawCount, saved: pack.saved, perDraw };
    }
  }
  if (!best) return null;
  return i18n.t("drawPackMath.teaser", {
    count: best.count,
    saved: formatCurrency(best.saved),
    perDraw: formatCurrency(best.perDraw),
  });
}

/** 当前抽数距「最划算连抽包」还差几抽（用于进度提示） */
export function getDrawPackProgressHint(
  currentCount: number,
  unitPrice: number,
  configs: DrawPackRateConfig[],
): string | null {
  if (currentCount <= 0 || !configs.length || unitPrice <= 0) return null;
  let bestCount = 0;
  let bestSaved = 0;
  for (const config of configs) {
    if (!config.enabled || config.drawCount <= 1) continue;
    const pack = calcPackPriceFromRates(unitPrice, config.drawCount, configs);
    if (pack.saved > bestSaved) {
      bestSaved = pack.saved;
      bestCount = config.drawCount;
    }
  }
  if (bestCount <= currentCount) return null;
  const need = bestCount - currentCount;
  const preview = calcPackPriceFromRates(unitPrice, bestCount, configs);
  return i18n.t("drawPackMath.progressHint", {
    need,
    count: bestCount,
    saved: formatCurrency(preview.saved),
  });
}
