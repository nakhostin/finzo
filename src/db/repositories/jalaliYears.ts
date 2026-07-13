import { db } from "@/db/db";
import type { JalaliYearRecord } from "@/types/entities";

export function listJalaliYears(): Promise<JalaliYearRecord[]> {
  return db.jalaliYears.orderBy("year").toArray();
}

export function updateJalaliYear(
  year: number,
  changes: Partial<Omit<JalaliYearRecord, "year">>,
): Promise<number> {
  return db.jalaliYears.update(year, changes);
}

export function countEntriesForYear(year: number): Promise<number> {
  return db.ledgerEntries.filter((e) => e.jalaliYear === year).count();
}

/** Deletes a fiscal year record along with every ledger entry generated for it. */
export async function deleteJalaliYear(year: number): Promise<void> {
  await db.transaction("rw", db.jalaliYears, db.ledgerEntries, async () => {
    await db.ledgerEntries.filter((e) => e.jalaliYear === year).delete();
    await db.jalaliYears.delete(year);
  });
}
