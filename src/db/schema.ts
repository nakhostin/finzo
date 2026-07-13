import Dexie, { type EntityTable } from "dexie";
import type {
  Category,
  Person,
  Account,
  RecurringItem,
  LedgerEntry,
  Cheque,
  AssetType,
  AssetLot,
  RateSnapshot,
  ShoppingItem,
  JalaliYearRecord,
} from "@/types/entities";

export interface AppSettingRecord {
  key: string;
  value: unknown;
}

export class AppDatabase extends Dexie {
  categories!: EntityTable<Category, "id">;
  people!: EntityTable<Person, "id">;
  accounts!: EntityTable<Account, "id">;
  recurringItems!: EntityTable<RecurringItem, "id">;
  ledgerEntries!: EntityTable<LedgerEntry, "id">;
  cheques!: EntityTable<Cheque, "id">;
  assetTypes!: EntityTable<AssetType, "id">;
  assetLots!: EntityTable<AssetLot, "id">;
  rateSnapshots!: EntityTable<RateSnapshot, "id">;
  shoppingItems!: EntityTable<ShoppingItem, "id">;
  jalaliYears!: EntityTable<JalaliYearRecord, "year">;
  appSettings!: EntityTable<AppSettingRecord, "key">;

  constructor() {
    super("personal-finance-db");

    // NOTE: Dexie migrations are append-only. Never edit a past version()
    // block — add a new version().stores() + upgrade() instead.
    this.version(1).stores({
      categories: "id, parentId, kind, isArchived",
      people: "id, isActive",
      accounts: "id, isArchived",
      recurringItems: "id, personId, categoryId, accountId, isActive, type, priority",
      ledgerEntries:
        "id, recurringItemId, [jalaliYear+jalaliMonth], [recurringItemId+jalaliYear+jalaliMonth], personId, categoryId, accountId, status, type",
      cheques: "id, accountId, counterpartyPersonId, status, direction",
      assetTypes: "id, code",
      assetLots: "id, assetTypeId, direction",
      rateSnapshots: "id, assetTypeId",
      shoppingItems: "id, status, categoryId",
      jalaliYears: "year",
    });

    // v2: adds a generic key/value settings table (used to persist the
    // File System Access API directory handle for automatic backups).
    this.version(2).stores({
      categories: "id, parentId, kind, isArchived",
      people: "id, isActive",
      accounts: "id, isArchived",
      recurringItems: "id, personId, categoryId, accountId, isActive, type, priority",
      ledgerEntries:
        "id, recurringItemId, [jalaliYear+jalaliMonth], [recurringItemId+jalaliYear+jalaliMonth], personId, categoryId, accountId, status, type",
      cheques: "id, accountId, counterpartyPersonId, status, direction",
      assetTypes: "id, code",
      assetLots: "id, assetTypeId, direction",
      rateSnapshots: "id, assetTypeId",
      shoppingItems: "id, status, categoryId",
      jalaliYears: "year",
      appSettings: "key",
    });
  }
}
