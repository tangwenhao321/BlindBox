import { api, buildAuthHeaders } from "../api";
import i18n from "../i18n";
import type { ApiResult } from "../types";
import { calcPackPriceFromRates, getBestPackTeaserFromRates } from "../utils/drawPackMath";
import { formatCurrency } from "../utils/formatCurrency";

export type DrawPackConfig = {
  id: string;
  drawCount: number;
  label: string;
  discountRate: number;
  enabled: boolean;
  sortOrder: number;
};

export const DEFAULT_DRAW_PACK_CONFIGS: DrawPackConfig[] = [
  { id: "pack-1", drawCount: 1, label: "Single draw", discountRate: 10000, enabled: true, sortOrder: 1 },
  { id: "pack-5", drawCount: 5, label: "5-pack", discountRate: 9850, enabled: true, sortOrder: 2 },
  { id: "pack-10", drawCount: 10, label: "10-pack", discountRate: 9700, enabled: true, sortOrder: 3 },
  { id: "pack-50", drawCount: 50, label: "50-pack", discountRate: 9600, enabled: true, sortOrder: 4 },
];

const FALLBACK = DEFAULT_DRAW_PACK_CONFIGS;

function localizePackConfig(config: DrawPackConfig): DrawPackConfig {
  const key = `drawPackDefaults.pack${config.drawCount}`;
  const label = i18n.exists(key) ? i18n.t(key) : config.label;
  return { ...config, label };
}

export async function queryDrawPackConfigs(token?: string) {
  try {
    const response = await api.get<ApiResult<DrawPackConfig[]>>("/front/mystery-box/draw-pack-configs", {
      headers: buildAuthHeaders(token || ""),
    });
    const list = response.data.result ?? [];
    const sorted = list.length ? list.sort((a, b) => a.sortOrder - b.sortOrder) : FALLBACK;
    return sorted.map(localizePackConfig);
  } catch {
    return FALLBACK.map(localizePackConfig);
  }
}

/** 列表/详情用的连抽卖点文案（取优惠力度最大的一档） */
export function getBestPackTeaser(unitPrice: number, configs: DrawPackConfig[]): string | null {
  return getBestPackTeaserFromRates(unitPrice, configs);
}

function defaultPackLabel(drawCount: number, configLabel?: string): string {
  const key = `drawPackDefaults.pack${drawCount}`;
  if (i18n.exists(key)) return i18n.t(key);
  return configLabel ?? i18n.t("drawPackDefaults.drawCount", { count: drawCount });
}

export function calcPackPrice(unitPrice: number, drawCount: number, configs: DrawPackConfig[]) {
  const config = configs.find((c) => c.drawCount === drawCount);
  const pack = calcPackPriceFromRates(unitPrice, drawCount, configs);
  return {
    label: defaultPackLabel(drawCount, config?.label),
    price: pack.price,
    original: pack.original,
    saved: pack.saved,
    discountTag:
      pack.saved > 0.01 ? i18n.t("drawPackDefaults.discountTag", { amount: formatCurrency(pack.saved) }) : undefined,
  };
}
