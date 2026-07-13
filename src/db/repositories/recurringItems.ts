import { db } from "@/db/db";
import type { RecurringItem } from "@/types/entities";

export function listRecurringItems(): Promise<RecurringItem[]> {
  return db.recurringItems.orderBy("priority").toArray();
}

export function getRecurringItem(id: string): Promise<RecurringItem | undefined> {
  return db.recurringItems.get(id);
}

export async function addRecurringItem(item: Omit<RecurringItem, "id">): Promise<RecurringItem> {
  const full: RecurringItem = { ...item, id: crypto.randomUUID() };
  await db.recurringItems.add(full);
  return full;
}

export function updateRecurringItem(
  id: string,
  changes: Partial<Omit<RecurringItem, "id">>,
): Promise<number> {
  return db.recurringItems.update(id, changes);
}

/**
 * Deletes the template and its not-yet-paid occurrences only. Paid/partial/skipped
 * LedgerEntry rows are left in place (they're fully self-contained/denormalized)
 * so financial history is never destroyed by removing a recurring item.
 */
export async function deleteRecurringItem(id: string): Promise<void> {
  await db.transaction("rw", db.recurringItems, db.ledgerEntries, async () => {
    await db.recurringItems.delete(id);
    await db.ledgerEntries
      .where("recurringItemId")
      .equals(id)
      .and((e) => e.status === "pending")
      .delete();
  });
}
