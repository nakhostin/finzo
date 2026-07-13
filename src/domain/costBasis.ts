import type { AssetLot } from "@/types/entities";
import { compareJalaliDate } from "@/domain/jalali";

export interface AssetPosition {
  quantityHeld: number;
  avgCost: number;
  totalCostBasis: number;
  realizedPL: number;
}

/**
 * Weighted-average cost-basis walk over an asset's full buy/sell history.
 * Locked-in method: switching to FIFO later would silently change every past
 * P&L figure, so this must stay the only cost-basis calculation in the app.
 */
export function computeAssetPosition(lots: AssetLot[]): AssetPosition {
  const sorted = [...lots].sort((a, b) => compareJalaliDate(a.jalaliDate, b.jalaliDate));

  let quantityHeld = 0;
  let totalCostBasis = 0;
  let realizedPL = 0;

  for (const lot of sorted) {
    if (lot.direction === "buy") {
      quantityHeld += lot.quantity;
      totalCostBasis += lot.quantity * lot.unitPrice;
    } else {
      const avgCost = quantityHeld > 0 ? totalCostBasis / quantityHeld : 0;
      const soldQty = Math.min(lot.quantity, quantityHeld);
      realizedPL += (lot.unitPrice - avgCost) * soldQty;
      totalCostBasis -= avgCost * soldQty;
      quantityHeld -= soldQty;
    }
  }

  const avgCost = quantityHeld > 0 ? totalCostBasis / quantityHeld : 0;
  return { quantityHeld, avgCost, totalCostBasis, realizedPL };
}

export interface AssetValuation extends AssetPosition {
  currentRate: number;
  currentValue: number;
  unrealizedPL: number;
}

export function valueAssetPosition(lots: AssetLot[], currentRate: number): AssetValuation {
  const position = computeAssetPosition(lots);
  const currentValue = position.quantityHeld * currentRate;
  const unrealizedPL = (currentRate - position.avgCost) * position.quantityHeld;
  return { ...position, currentRate, currentValue, unrealizedPL };
}
