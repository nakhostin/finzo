import { db } from "@/db/db";
import { clampDueDay, compareYearMonth } from "@/domain/jalali";
import type { LedgerEntry, RecurringItem } from "@/types/entities";

interface Applicability {
  applies: boolean;
  amount: number;
}

function resolveApplicability(item: RecurringItem, year: number, month: number): Applicability {
  const start = { year: item.startYear, month: item.startMonth };
  const point = { year, month };

  if (item.frequency === "once") {
    return { applies: compareYearMonth(point, start) === 0, amount: item.defaultAmount };
  }

  if (compareYearMonth(point, start) < 0) return { applies: false, amount: 0 };
  if (item.endYear !== undefined && item.endMonth !== undefined) {
    const end = { year: item.endYear, month: item.endMonth };
    if (compareYearMonth(point, end) > 0) return { applies: false, amount: 0 };
  }

  const monthsSinceStart =
    (year - item.startYear) * 12 + (month - item.startMonth);

  if (item.installmentSchedule) {
    if (monthsSinceStart < 0 || monthsSinceStart >= item.installmentSchedule.length) {
      return { applies: false, amount: 0 };
    }
    return { applies: true, amount: item.installmentSchedule[monthsSinceStart] };
  }

  return { applies: true, amount: item.defaultAmount };
}

/**
 * Upserts LedgerEntry occurrences for every active RecurringItem that applies to
 * the given Jalali year. Idempotent: re-running never duplicates, and never
 * overwrites an entry whose status has moved past "pending" (paid/partial/
 * skipped), so editing a template can't silently corrupt already-settled months.
 */
export async function generateOccurrencesForYear(year: number): Promise<void> {
  const items = await db.recurringItems.filter((i) => i.isActive).toArray();

  await db.transaction("rw", db.ledgerEntries, async () => {
    for (const item of items) {
      for (let month = 1; month <= 12; month++) {
        const { applies, amount } = resolveApplicability(item, year, month);
        if (!applies) continue;

        const existing = await db.ledgerEntries
          .where({ recurringItemId: item.id, jalaliYear: year, jalaliMonth: month })
          .first();

        const dueDay = clampDueDay(year, month, item.dueDay);

        if (!existing) {
          const entry: LedgerEntry = {
            id: crypto.randomUUID(),
            recurringItemId: item.id,
            jalaliYear: year,
            jalaliMonth: month,
            dueDay,
            title: item.title,
            type: item.type,
            categoryId: item.categoryId,
            personId: item.personId,
            accountId: item.accountId,
            priority: item.priority,
            amountPlanned: amount,
            status: "pending",
            reminderDaysBefore: item.reminderDaysBefore,
          };
          await db.ledgerEntries.add(entry);
        } else if (existing.status === "pending") {
          await db.ledgerEntries.update(existing.id, {
            dueDay,
            title: item.title,
            type: item.type,
            categoryId: item.categoryId,
            personId: item.personId,
            accountId: item.accountId,
            priority: item.priority,
            amountPlanned: amount,
            reminderDaysBefore: item.reminderDaysBefore,
          });
        }
      }
    }
  });
}

/** Ensures the given years have their recurring occurrences generated (e.g. on app load or after editing a template). */
export async function ensureYearsGenerated(years: number[]): Promise<void> {
  const uniqueYears = [...new Set(years)];
  for (const year of uniqueYears) {
    await generateOccurrencesForYear(year);
    await db.jalaliYears.put({ year, isActive: true, occurrencesGeneratedThrough: 12 });
  }
}
