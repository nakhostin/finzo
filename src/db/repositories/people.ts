import { db } from "@/db/db";
import type { Person } from "@/types/entities";

export function listPeople(): Promise<Person[]> {
  return db.people.filter((p) => p.isActive).toArray();
}

export function getPerson(id: string): Promise<Person | undefined> {
  return db.people.get(id);
}

export async function addPerson(name: string): Promise<Person> {
  const person: Person = { id: crypto.randomUUID(), name, isActive: true };
  await db.people.add(person);
  return person;
}

export function updatePerson(id: string, changes: Partial<Omit<Person, "id">>): Promise<number> {
  return db.people.update(id, changes);
}
