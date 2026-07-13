import { db } from "@/db/db";
import { listChequesForMonth } from "@/db/repositories/cheques";
import type { LedgerEntry, EntryStatus, JalaliDate } from "@/types/entities";

export function listEntriesForMonth(year: number, month: number): Promise<LedgerEntry[]> {
  return db.ledgerEntries.where({ jalaliYear: year, jalaliMonth: month }).toArray();
}

export function listEntriesForPerson(personId: string): Promise<LedgerEntry[]> {
  return db.ledgerEntries.where("personId").equals(personId).toArray();
}

export function listEntriesForYear(year: number): Promise<LedgerEntry[]> {
  return db.ledgerEntries.filter((e) => e.jalaliYear === year).toArray();
}

export function getLedgerEntry(id: string): Promise<LedgerEntry | undefined> {
  return db.ledgerEntries.get(id);
}

export function updateLedgerEntry(
  id: string,
  changes: Partial<Omit<LedgerEntry, "id">>,
): Promise<number> {
  return db.ledgerEntries.update(id, changes);
}

export async function setEntryStatus(
  id: string,
  status: EntryStatus,
  paidJalaliDate?: JalaliDate,
  amountActual?: number,
): Promise<void> {
  await db.ledgerEntries.update(id, {
    status,
    ...(paidJalaliDate ? { paidJalaliDate } : {}),
    ...(amountActual !== undefined ? { amountActual } : {}),
  });
}

export interface CashFlowBreakdown {
  income: number;
  receivable: number;
  chequesIn: number;
  totalIn: number;
  debt: number;
  installment: number;
  expense: number;
  chequesOut: number;
  totalOut: number;
  net: number;
}

/**
 * Full in/out breakdown for a month: entries plus that month's cheques (by
 * due date). An issued cheque is money owed out, a received cheque is money
 * expected in. Cancelled cheques are void and excluded; bounced ones still
 * count since the underlying obligation/expectation hasn't gone away.
 * "In" = income + receivable + cheques received; "out" = debt + installment
 * + expense + cheques issued — per the user's own grouping for the dashboard
 * cash-flow card.
 */
export async function getCashFlowBreakdown(year: number, month: number): Promise<CashFlowBreakdown> {
  const [entries, cheques] = await Promise.all([
    listEntriesForMonth(year, month),
    listChequesForMonth(year, month),
  ]);

  const base = entries.reduce(
    (acc, e) => {
      if (e.status === "skipped") return acc;
      const amount = e.amountActual ?? e.amountPlanned;
      if (e.type === "income") acc.income += amount;
      else if (e.type === "debt") acc.debt += amount;
      else if (e.type === "installment") acc.installment += amount;
      else if (e.type === "receivable") acc.receivable += amount;
      else acc.expense += amount;
      return acc;
    },
    { income: 0, debt: 0, installment: 0, receivable: 0, expense: 0 },
  );

  let chequesIn = 0;
  let chequesOut = 0;
  for (const c of cheques) {
    if (c.status === "cancelled") continue;
    if (c.direction === "issued") chequesOut += c.amount;
    else chequesIn += c.amount;
  }

  const totalIn = base.income + base.receivable + chequesIn;
  const totalOut = base.debt + base.installment + base.expense + chequesOut;

  return {
    income: base.income,
    receivable: base.receivable,
    chequesIn,
    totalIn,
    debt: base.debt,
    installment: base.installment,
    expense: base.expense,
    chequesOut,
    totalOut,
    net: totalIn - totalOut,
  };
}
