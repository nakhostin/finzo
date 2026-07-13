import {
  toJalaali,
  toGregorian,
  jalaaliMonthLength,
  isLeapJalaaliYear,
} from "jalaali-js";
import type { JalaliDate } from "@/types/entities";

export const MONTH_NAMES_FA = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

export function today(): JalaliDate {
  const j = toJalaali(new Date());
  return { year: j.jy, month: j.jm, day: j.jd };
}

export function daysInMonth(year: number, month: number): number {
  return jalaaliMonthLength(year, month);
}

export function isLeapYear(year: number): boolean {
  return isLeapJalaaliYear(year);
}

/** Clamps a nominal due-day (e.g. 31) to the last real day of the given Jalali month. */
export function clampDueDay(year: number, month: number, dueDay: number): number {
  return Math.min(Math.max(1, dueDay), daysInMonth(year, month));
}

/** Adds `count` months to a (year, month) pair, rolling the year over as needed. */
export function addMonths(
  year: number,
  month: number,
  count: number,
): { year: number; month: number } {
  const zeroBased = (month - 1) + count;
  const newYear = year + Math.floor(zeroBased / 12);
  const newMonth = ((zeroBased % 12) + 12) % 12 + 1;
  return { year: newYear, month: newMonth };
}

/** Ordering helper: negative if a < b, 0 if equal, positive if a > b. */
export function compareYearMonth(
  a: { year: number; month: number },
  b: { year: number; month: number },
): number {
  return a.year !== b.year ? a.year - b.year : a.month - b.month;
}

export function compareJalaliDate(a: JalaliDate, b: JalaliDate): number {
  const ym = compareYearMonth(a, b);
  return ym !== 0 ? ym : a.day - b.day;
}

export function toDate(d: JalaliDate): Date {
  const g = toGregorian(d.year, d.month, d.day);
  return new Date(g.gy, g.gm - 1, g.gd);
}

/** Whole days from `b` to `a` (positive when `a` is in the future relative to `b`). */
export function diffInDays(a: JalaliDate, b: JalaliDate): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((toDate(a).getTime() - toDate(b).getTime()) / msPerDay);
}

export function fromDate(date: Date): JalaliDate {
  const j = toJalaali(date);
  return { year: j.jy, month: j.jm, day: j.jd };
}

export const WEEKDAY_NAMES_FA = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
] as const;

/** Index (0=شنبه/Saturday .. 6=جمعه/Friday) of a Jalali date within the Persian week. */
export function weekdayIndex(d: JalaliDate): number {
  return (toDate(d).getDay() + 1) % 7;
}

export function monthLabel(month: number): string {
  return MONTH_NAMES_FA[month - 1] ?? "";
}

export function formatJalaliDate(d: JalaliDate): string {
  return toPersianDigits(`${d.year}/${pad2(d.month)}/${pad2(d.day)}`);
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

// Persian (U+06F0-06F9) and Arabic-Indic (U+0660-0669) digit blocks, in order 0-9.
const NON_ASCII_DIGITS = /[۰-۹٠-٩]/g;

/**
 * Converts Persian/Arabic-Indic digits to ASCII 0-9. Native `<input type="number">`
 * silently rejects Persian-Indic keystrokes (a very common input method on Iranian
 * keyboards), so any numeric field a user can type into must normalize through this
 * before the value is used as a number.
 */
export function toEnglishDigits(input: string): string {
  return input.replace(NON_ASCII_DIGITS, (d) => String(d.charCodeAt(0) & 0xf));
}
