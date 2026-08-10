import type { DrawPackOption } from "../components/DrawPackModal";
import { calcPackPrice, type DrawPackConfig } from "../services/drawPackService";

export function buildDrawPackOptions(unitPrice: number, configs: DrawPackConfig[]): DrawPackOption[] {
  return configs.map((config) => {
    const pack = calcPackPrice(unitPrice, config.drawCount, configs);
    return {
      count: config.drawCount,
      label: config.label,
      price: pack.price,
      originalPrice: config.drawCount > 1 ? pack.original : undefined,
      discountTag: pack.discountTag,
    };
  });
}
