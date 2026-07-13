import { db } from "@/db/db";
import type { Account } from "@/types/entities";

export function listAccounts(): Promise<Account[]> {
  return db.accounts.filter((a) => !a.isArchived).toArray();
}

/** All accounts including archived ones — for the settings management view. */
export function listAllAccounts(): Promise<Account[]> {
  return db.accounts.toArray();
}

export async function addAccount(account: Omit<Account, "id" | "isArchived">): Promise<Account> {
  const full: Account = {
    ...account,
    id: crypto.randomUUID(),
    isArchived: false,
  };
  await db.accounts.add(full);
  return full;
}

export function updateAccount(id: string, changes: Partial<Omit<Account, "id">>): Promise<number> {
  return db.accounts.update(id, changes);
}
