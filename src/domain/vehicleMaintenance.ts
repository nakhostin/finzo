import { diffInDays, today } from "@/domain/jalali";
import type { MaintenanceRecord } from "@/types/entities";

/** Common consumable/service types offered in the dropdown (user can also type a custom one). */
export const MAINTENANCE_TYPES_FA = [
  "روغن موتور",
  "فیلتر روغن",
  "فیلتر هوا",
  "فیلتر بنزین",
  "فیلتر کابین",
  "لاستیک",
  "باتری",
  "تسمه تایم",
  "لنت ترمز",
  "روغن ترمز",
  "روغن گیربکس",
  "روغن هیدرولیک فرمان",
  "مایع خنک‌کننده (ضدیخ)",
  "شمع",
  "بالانس و تنظیم فرمان",
  "دیسک و صفحه کلاچ",
] as const;

/** Thresholds for flagging a service as "coming up soon". */
const SOON_DAYS = 30;
const SOON_KM = 1000;

export type DueLevel = "overdue" | "soon" | "ok" | "none";

export interface DueStatus {
  level: DueLevel;
  /** Whole days until the next-due date (negative = past). Undefined when no next date is set. */
  daysLeft?: number;
  /** Kilometres until the next-due odometer reading (negative = past). Undefined when unknown. */
  kmLeft?: number;
}

/**
 * Evaluates how urgent a maintenance record's next-due is, combining its
 * next date and next odometer target against today and the vehicle's current km.
 * The more urgent of the two signals wins.
 */
export function evaluateDueStatus(
  record: MaintenanceRecord,
  currentKm?: number,
): DueStatus {
  const now = today();
  const daysLeft = record.nextJalaliDate ? diffInDays(record.nextJalaliDate, now) : undefined;
  const kmLeft =
    record.nextKm != null && currentKm != null ? record.nextKm - currentKm : undefined;

  const levels: DueLevel[] = [];
  if (daysLeft != null) {
    levels.push(daysLeft < 0 ? "overdue" : daysLeft <= SOON_DAYS ? "soon" : "ok");
  }
  if (kmLeft != null) {
    levels.push(kmLeft < 0 ? "overdue" : kmLeft <= SOON_KM ? "soon" : "ok");
  }

  const rank: Record<DueLevel, number> = { overdue: 3, soon: 2, ok: 1, none: 0 };
  const level = levels.reduce<DueLevel>(
    (worst, l) => (rank[l] > rank[worst] ? l : worst),
    levels.length ? "ok" : "none",
  );

  return { level, daysLeft, kmLeft };
}

/**
 * Returns the most recent maintenance record per service type — the record whose
 * next-due is still relevant (older services of the same type are superseded).
 */
export function latestPerType(records: MaintenanceRecord[]): MaintenanceRecord[] {
  const byType = new Map<string, MaintenanceRecord>();
  for (const record of records) {
    const existing = byType.get(record.type);
    if (!existing || compareByDoneDate(record, existing) > 0) {
      byType.set(record.type, record);
    }
  }
  return [...byType.values()];
}

function compareByDoneDate(a: MaintenanceRecord, b: MaintenanceRecord): number {
  const d = diffInDays(a.doneJalaliDate, b.doneJalaliDate);
  if (d !== 0) return d;
  // Same day → prefer the higher odometer reading as "later".
  return (a.doneKm ?? 0) - (b.doneKm ?? 0);
}
