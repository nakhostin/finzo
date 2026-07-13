import { db } from "@/db/db";
import { computeAssetPosition } from "@/domain/costBasis";
import { compareJalaliDate } from "@/domain/jalali";
import type { LedgerEntry, Cheque, AssetLot, RateSnapshot } from "@/types/entities";

function monthKey(year: number, month: number): number {
  return year * 12 + month;
}

export interface CategoryFlow {
  categoryId: string | undefined;
  amount: number;
}

/** Sums expense-type entries (debt/installment/expense) by category for a given Jalali year. */
export function cashFlowByCategory(entries: LedgerEntry[], year: number): CategoryFlow[] {
  const totals = new Map<string | undefined, number>();
  for (const e of entries) {
    if (e.jalaliYear !== year) continue;
    if (e.status === "skipped") continue;
    if (e.type !== "expense" && e.type !== "debt" && e.type !== "installment") continue;
    const amount = e.amountActual ?? e.amountPlanned;
    totals.set(e.categoryId, (totals.get(e.categoryId) ?? 0) + amount);
  }
  return [...totals.entries()].map(([categoryId, amount]) => ({ categoryId, amount }));
}

export interface ChequeStatusSummary {
  status: Cheque["status"];
  count: number;
  totalAmount: number;
}

export function chequeStatusSummary(cheques: Cheque[]): ChequeStatusSummary[] {
  const totals = new Map<Cheque["status"], { count: number; totalAmount: number }>();
  for (const c of cheques) {
    const current = totals.get(c.status) ?? { count: 0, totalAmount: 0 };
    current.count += 1;
    current.totalAmount += c.amount;
    totals.set(c.status, current);
  }
  return [...totals.entries()].map(([status, v]) => ({ status, ...v }));
}

export interface YearlyTotals {
  year: number;
  income: number;
  debt: number;
  expense: number;
}

export function yearlyComparison(entries: LedgerEntry[]): YearlyTotals[] {
  const totals = new Map<number, YearlyTotals>();
  for (const e of entries) {
    if (e.status === "skipped") continue;
    const amount = e.amountActual ?? e.amountPlanned;
    const current = totals.get(e.jalaliYear) ?? { year: e.jalaliYear, income: 0, debt: 0, expense: 0 };
    if (e.type === "income") current.income += amount;
    else if (e.type === "debt" || e.type === "installment") current.debt += amount;
    else if (e.type === "expense") current.expense += amount;
    totals.set(e.jalaliYear, current);
  }
  return [...totals.values()].sort((a, b) => a.year - b.year);
}

function nearestRateAtOrBefore(
  rates: RateSnapshot[],
  assetTypeId: string,
  year: number,
  month: number,
): number {
  const candidates = rates
    .filter((r) => r.assetTypeId === assetTypeId && monthKey(r.jalaliDate.year, r.jalaliDate.month) <= monthKey(year, month))
    .sort((a, b) => compareJalaliDate(b.jalaliDate, a.jalaliDate));
  return candidates[0]?.rate ?? 0;
}

export interface NetWorthPoint {
  year: number;
  month: number;
  netWorth: number;
}

/**
 * Approximates net worth at each month-end of `year` using entries/lots whose
 * own (year, month) falls on or before that point — a due-month approximation
 * rather than exact payment-date reconstruction, which is precise enough for
 * a personal finance trend line.
 */
export function netWorthTrend(
  entries: LedgerEntry[],
  assetLots: AssetLot[],
  rates: RateSnapshot[],
  assetTypeIds: string[],
  accountsInitialTotal: number,
  year: number,
): NetWorthPoint[] {
  const points: NetWorthPoint[] = [];
  for (let month = 1; month <= 12; month++) {
    const cutoff = monthKey(year, month);
    let cashFlow = 0;
    let openDebt = 0;
    let openReceivable = 0;

    for (const e of entries) {
      if (monthKey(e.jalaliYear, e.jalaliMonth) > cutoff) continue;
      if (e.status === "skipped") continue;
      const amount = e.amountActual ?? e.amountPlanned;
      const isOpen = e.status === "pending" || e.status === "overdue" || e.status === "partial";
      if (e.type === "income" && !isOpen) cashFlow += amount;
      else if ((e.type === "debt" || e.type === "installment") && !isOpen) cashFlow -= amount;
      else if (e.type === "expense" && !isOpen) cashFlow -= amount;
      else if ((e.type === "debt" || e.type === "installment") && isOpen) openDebt += amount;
      else if (e.type === "receivable" && isOpen) openReceivable += amount;
    }

    let assetsValue = 0;
    for (const assetTypeId of assetTypeIds) {
      const lotsUpToPoint = assetLots.filter(
        (l) => l.assetTypeId === assetTypeId && monthKey(l.jalaliDate.year, l.jalaliDate.month) <= cutoff,
      );
      const position = computeAssetPosition(lotsUpToPoint);
      const rate = nearestRateAtOrBefore(rates, assetTypeId, year, month);
      assetsValue += position.quantityHeld * rate;
    }

    const netWorth = accountsInitialTotal + cashFlow - openDebt + openReceivable + assetsValue;
    points.push({ year, month, netWorth });
  }
  return points;
}

export interface CurrentNetWorth {
  cashPosition: number;
  openDebt: number;
  openReceivable: number;
  assetsValue: number;
  netWorth: number;
}

export async function currentNetWorth(): Promise<CurrentNetWorth> {
  const [entries, accounts, assetTypes, assetLots, rates] = await Promise.all([
    db.ledgerEntries.toArray(),
    db.accounts.toArray(),
    db.assetTypes.toArray(),
    db.assetLots.toArray(),
    db.rateSnapshots.toArray(),
  ]);

  let cashPosition = accounts.reduce((sum, a) => sum + a.initialBalance, 0);
  let openDebt = 0;
  let openReceivable = 0;

  for (const e of entries) {
    if (e.status === "skipped") continue;
    const amount = e.amountActual ?? e.amountPlanned;
    const isOpen = e.status === "pending" || e.status === "overdue" || e.status === "partial";
    if (e.type === "income" && !isOpen) cashPosition += amount;
    else if ((e.type === "debt" || e.type === "installment") && !isOpen) cashPosition -= amount;
    else if (e.type === "expense" && !isOpen) cashPosition -= amount;
    else if ((e.type === "debt" || e.type === "installment") && isOpen) openDebt += amount;
    else if (e.type === "receivable" && isOpen) openReceivable += amount;
  }

  let assetsValue = 0;
  for (const assetType of assetTypes) {
    const lots = assetLots.filter((l) => l.assetTypeId === assetType.id);
    const position = computeAssetPosition(lots);
    const rate = rates
      .filter((r) => r.assetTypeId === assetType.id)
      .sort((a, b) => compareJalaliDate(b.jalaliDate, a.jalaliDate))[0]?.rate ?? 0;
    assetsValue += position.quantityHeld * rate;
  }

  return {
    cashPosition,
    openDebt,
    openReceivable,
    assetsValue,
    netWorth: cashPosition - openDebt + openReceivable + assetsValue,
  };
}
