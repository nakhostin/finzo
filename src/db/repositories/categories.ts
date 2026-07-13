import { db } from "@/db/db";
import type { Category, CategoryKind } from "@/types/entities";

export function listCategories(): Promise<Category[]> {
  return db.categories.filter((c) => !c.isArchived).toArray();
}

export async function addCategory(nameFa: string, kind: CategoryKind): Promise<Category> {
  const category: Category = {
    id: crypto.randomUUID(),
    name: nameFa,
    nameFa,
    kind,
    isArchived: false,
  };
  await db.categories.add(category);
  return category;
}

export function updateCategory(id: string, changes: Partial<Omit<Category, "id">>): Promise<number> {
  return db.categories.update(id, changes);
}
