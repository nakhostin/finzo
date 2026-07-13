export type ID = string;

export interface JalaliDate {
  year: number;
  month: number; // 1-12
  day: number;
}

export type CategoryKind = "income" | "expense" | "both";

export interface Category {
  id: ID;
  name: string;
  nameFa: string;
  kind: CategoryKind;
  parentId?: ID;
  color?: string;
  icon?: string;
  isArchived: boolean;
}

export interface Person {
  id: ID;
  name: string;
  notes?: string;
  isActive: boolean;
}

export type AccountType = "bank" | "cash" | "other";

export interface Account {
  id: ID;
  name: string;
  bankName?: string;
  cardNumber?: string;
  accountNumber?: string;
  iban?: string;
  type: AccountType;
  initialBalance: number;
  isArchived: boolean;
}

export type ItemType = "debt" | "installment" | "income" | "expense" | "receivable";

export interface RecurringItem {
  id: ID;
  title: string;
  type: ItemType;
  categoryId?: ID;
  personId?: ID;
  accountId?: ID;
  priority: number;
  dueDay: number; // 1-31, clamped to actual days-in-month at generation time
  defaultAmount: number;
  installmentSchedule?: number[]; // fixed sequence of amounts, index 0 = startMonth
  frequency: "monthly" | "once";
  startYear: number;
  startMonth: number;
  endYear?: number;
  endMonth?: number;
  isActive: boolean;
  reminderDaysBefore?: number;
  notes?: string;
}

export type EntryStatus = "pending" | "paid" | "partial" | "skipped" | "overdue";

export interface LedgerEntry {
  id: ID;
  recurringItemId?: ID;
  jalaliYear: number;
  jalaliMonth: number; // 1-12
  dueDay: number;
  title: string;
  type: ItemType;
  categoryId?: ID;
  personId?: ID;
  accountId?: ID;
  priority: number;
  amountPlanned: number;
  amountActual?: number;
  status: EntryStatus;
  paidJalaliDate?: JalaliDate;
  reminderDaysBefore?: number;
  notes?: string;
}

export type ChequeDirection = "issued" | "received";
export type ChequeStatus = "in-hand" | "deposited" | "cleared" | "bounced" | "cancelled";

export interface ChequeStatusEvent {
  status: ChequeStatus;
  jalaliDate: JalaliDate;
  note?: string;
}

export interface Cheque {
  id: ID;
  chequeNumber: string;
  accountId: ID;
  direction: ChequeDirection;
  counterpartyPersonId?: ID;
  amount: number;
  issueJalaliDate: JalaliDate;
  dueJalaliDate: JalaliDate;
  status: ChequeStatus;
  statusHistory: ChequeStatusEvent[];
  relatedLedgerEntryId?: ID;
  reminderDaysBefore?: number;
  notes?: string;
}

export type AssetCode = "USD" | "TRY" | "GOLD" | "SILVER" | string;

export type AssetCategory = "currency" | "metal" | "crypto" | "stock" | "other";

export interface AssetType {
  id: ID;
  code: AssetCode;
  nameFa: string;
  unit: string; // دلار، لیر، گرم، عدد، سهم
  category?: AssetCategory; // absent on pre-existing rows from before categories existed
  isArchived?: boolean;
}

export interface AssetLot {
  id: ID;
  assetTypeId: ID;
  direction: "buy" | "sell";
  quantity: number;
  unitPrice: number;
  jalaliDate: JalaliDate;
  notes?: string;
}

export interface RateSnapshot {
  id: ID;
  assetTypeId: ID;
  rate: number;
  jalaliDate: JalaliDate;
}

export type ShoppingStatus = "wishlist" | "planned" | "purchased" | "cancelled";

export interface ShoppingItem {
  id: ID;
  title: string;
  quantity: number;
  estimatedPrice?: number;
  actualPrice?: number;
  status: ShoppingStatus;
  priority: number;
  categoryId?: ID;
  addedJalaliDate: JalaliDate;
  purchasedJalaliDate?: JalaliDate;
  notes?: string;
}

export interface JalaliYearRecord {
  year: number;
  isActive: boolean;
  occurrencesGeneratedThrough?: number; // last month (1-12) generated
}
