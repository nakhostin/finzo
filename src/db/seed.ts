import { db } from "@/db/db";
import { today } from "@/domain/jalali";
import type { Category, AssetType, Account } from "@/types/entities";

const DEFAULT_CATEGORIES: Array<Omit<Category, "id">> = [
  { name: "home", nameFa: "مخارج خانه", kind: "expense", isArchived: false },
  { name: "spouse", nameFa: "مخارج همسر", kind: "expense", isArchived: false },
  { name: "gift", nameFa: "کادو", kind: "expense", isArchived: false },
  { name: "car", nameFa: "خودرو", kind: "expense", isArchived: false },
  { name: "travel", nameFa: "سفر", kind: "expense", isArchived: false },
  { name: "savings", nameFa: "پس‌انداز", kind: "expense", isArchived: false },
  { name: "salary", nameFa: "حقوق", kind: "income", isArchived: false },
  { name: "other-income", nameFa: "سایر درآمدها", kind: "income", isArchived: false },
  { name: "other-expense", nameFa: "سایر مخارج", kind: "expense", isArchived: false },
];

const DEFAULT_ASSET_TYPES: Array<Omit<AssetType, "id">> = [
  { code: "USD", nameFa: "دلار آمریکا", unit: "دلار", category: "currency" },
  { code: "TRY", nameFa: "لیر ترکیه", unit: "لیر", category: "currency" },
  { code: "GOLD", nameFa: "طلا", unit: "گرم", category: "metal" },
  { code: "SILVER", nameFa: "نقره", unit: "گرم", category: "metal" },
];

const DEFAULT_ACCOUNTS: Array<Omit<Account, "id">> = [
  { name: "نقدی", type: "cash", initialBalance: 0, isArchived: false },
];

export async function seedDatabaseIfEmpty(): Promise<void> {
  const categoryCount = await db.categories.count();
  if (categoryCount === 0) {
    await db.categories.bulkAdd(
      DEFAULT_CATEGORIES.map((c) => ({ ...c, id: crypto.randomUUID() })),
    );
  }

  const assetTypeCount = await db.assetTypes.count();
  if (assetTypeCount === 0) {
    await db.assetTypes.bulkAdd(
      DEFAULT_ASSET_TYPES.map((a) => ({ ...a, id: crypto.randomUUID() })),
    );
  }

  const accountCount = await db.accounts.count();
  if (accountCount === 0) {
    await db.accounts.bulkAdd(
      DEFAULT_ACCOUNTS.map((a) => ({ ...a, id: crypto.randomUUID() })),
    );
  }

  const currentYear = today().year;
  const yearRecord = await db.jalaliYears.get(currentYear);
  if (!yearRecord) {
    await db.jalaliYears.add({ year: currentYear, isActive: true });
  }
}
