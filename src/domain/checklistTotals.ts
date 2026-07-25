import type { ItemType, LedgerEntry } from "@/types/entities";

/** Types that bring money in; everything else is money going out. */
const INFLOW_TYPES: ReadonlySet<ItemType> = new Set<ItemType>(["income", "receivable"]);

export function isInflow(type: ItemType): boolean {
  return INFLOW_TYPES.has(type);
}

export function entryAmount(entry: LedgerEntry): number {
  return entry.amountActual ?? entry.amountPlanned;
}

export interface ChecklistTotals {
  count: number;
  /** income + receivable */
  totalIn: number;
  /** debt + installment + expense */
  totalOut: number;
  net: number;
  /** Outflows already settled (status "paid"). */
  paidOut: number;
  /** Outflows still owed — neither paid nor skipped. This is the "how much do I still need" number. */
  remainingOut: number;
  perType: Record<ItemType, number>;
}

const EMPTY_PER_TYPE = (): Record<ItemType, number> => ({
  debt: 0,
  installment: 0,
  income: 0,
  expense: 0,
  receivable: 0,
});

/**
 * Sums a set of checklist entries. Skipped entries are excluded from every
 * total — a skipped item is one the user decided not to act on, so counting it
 * would overstate both the plan and what's left to pay.
 */
export function summarizeEntries(entries: LedgerEntry[]): ChecklistTotals {
  const perType = EMPTY_PER_TYPE();
  let count = 0;
  let totalIn = 0;
  let totalOut = 0;
  let paidOut = 0;
  let remainingOut = 0;

  for (const entry of entries) {
    if (entry.status === "skipped") continue;
    const amount = entryAmount(entry);
    count += 1;
    perType[entry.type] += amount;
    if (isInflow(entry.type)) {
      totalIn += amount;
    } else {
      totalOut += amount;
      if (entry.status === "paid") paidOut += amount;
      else remainingOut += amount;
    }
  }

  return { count, totalIn, totalOut, net: totalIn - totalOut, paidOut, remainingOut, perType };
}
