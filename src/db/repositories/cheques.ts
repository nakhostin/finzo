import { db } from "@/db/db";
import { today } from "@/domain/jalali";
import type { Cheque, ChequeStatus } from "@/types/entities";

export function listCheques(): Promise<Cheque[]> {
  return db.cheques.toArray();
}

export function getCheque(id: string): Promise<Cheque | undefined> {
  return db.cheques.get(id);
}

export function listChequesForPerson(personId: string): Promise<Cheque[]> {
  return db.cheques.where("counterpartyPersonId").equals(personId).toArray();
}

export async function listChequesForMonth(year: number, month: number): Promise<Cheque[]> {
  const all = await db.cheques.toArray();
  return all.filter((c) => c.dueJalaliDate.year === year && c.dueJalaliDate.month === month);
}

export async function addCheque(
  cheque: Omit<Cheque, "id" | "status" | "statusHistory">,
): Promise<Cheque> {
  const full: Cheque = {
    ...cheque,
    id: crypto.randomUUID(),
    status: "in-hand",
    statusHistory: [{ status: "in-hand", jalaliDate: cheque.issueJalaliDate }],
  };
  await db.cheques.add(full);
  return full;
}

export function updateCheque(id: string, changes: Partial<Omit<Cheque, "id">>): Promise<number> {
  return db.cheques.update(id, changes);
}

export async function transitionChequeStatus(
  id: string,
  status: ChequeStatus,
  note?: string,
): Promise<void> {
  const cheque = await db.cheques.get(id);
  if (!cheque) return;
  await db.cheques.update(id, {
    status,
    statusHistory: [...cheque.statusHistory, { status, jalaliDate: today(), note }],
  });
}

export function deleteCheque(id: string): Promise<void> {
  return db.cheques.delete(id);
}
