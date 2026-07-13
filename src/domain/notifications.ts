import { db } from "@/db/db";
import { diffInDays, today } from "@/domain/jalali";
import type { ItemType, ChequeDirection, JalaliDate } from "@/types/entities";

/** Used whenever an item doesn't have its own reminderDaysBefore set. */
export const DEFAULT_REMINDER_DAYS_BEFORE = 3;

export interface ReminderItem {
  kind: "entry" | "cheque";
  id: string;
  title: string;
  amount: number;
  dueDate: JalaliDate;
  daysUntilDue: number;
  type?: ItemType;
  direction?: ChequeDirection;
}

/**
 * Every unsettled ledger entry / cheque whose due date is within its own
 * configured reminder window (or already overdue). Entries default to a
 * 3-day heads-up when reminderDaysBefore isn't set on the item itself.
 */
export async function listActiveReminders(): Promise<ReminderItem[]> {
  const [entries, cheques] = await Promise.all([db.ledgerEntries.toArray(), db.cheques.toArray()]);
  const t = today();
  const items: ReminderItem[] = [];

  for (const e of entries) {
    if (e.status === "paid" || e.status === "skipped") continue;
    const dueDate: JalaliDate = { year: e.jalaliYear, month: e.jalaliMonth, day: e.dueDay };
    const daysUntilDue = diffInDays(dueDate, t);
    const lead = e.reminderDaysBefore ?? DEFAULT_REMINDER_DAYS_BEFORE;
    if (daysUntilDue > lead) continue;
    items.push({
      kind: "entry",
      id: e.id,
      title: e.title,
      amount: e.amountActual ?? e.amountPlanned,
      dueDate,
      daysUntilDue,
      type: e.type,
    });
  }

  for (const c of cheques) {
    if (c.status === "cleared" || c.status === "cancelled") continue;
    const daysUntilDue = diffInDays(c.dueJalaliDate, t);
    const lead = c.reminderDaysBefore ?? DEFAULT_REMINDER_DAYS_BEFORE;
    if (daysUntilDue > lead) continue;
    items.push({
      kind: "cheque",
      id: c.id,
      title: `چک ${c.chequeNumber}`,
      amount: c.amount,
      dueDate: c.dueJalaliDate,
      daysUntilDue,
      direction: c.direction,
    });
  }

  return items.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}
