import { db } from "@/db/db";
import type { ShoppingItem } from "@/types/entities";

export function listShoppingItems(): Promise<ShoppingItem[]> {
  return db.shoppingItems.toArray();
}

export async function addShoppingItem(item: Omit<ShoppingItem, "id">): Promise<ShoppingItem> {
  const full: ShoppingItem = { ...item, id: crypto.randomUUID() };
  await db.shoppingItems.add(full);
  return full;
}

export function updateShoppingItem(
  id: string,
  changes: Partial<Omit<ShoppingItem, "id">>,
): Promise<number> {
  return db.shoppingItems.update(id, changes);
}

export function deleteShoppingItem(id: string): Promise<void> {
  return db.shoppingItems.delete(id);
}
