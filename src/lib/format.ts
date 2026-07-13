import { toPersianDigits } from "@/domain/jalali";

const numberFormatter = new Intl.NumberFormat("en-US");

const LRI = "\u2066"; // left-to-right isolate
const PDI = "\u2069"; // pop directional isolate

/**
 * Wraps a numeral string in a bidi isolate so the ASCII minus sign and thousands
 * separators produced by Intl.NumberFormat can't get reordered by the
 * surrounding RTL text (without this, e.g. "-1,234" renders with the sign
 * flipped to the wrong side inside a Persian sentence).
 */
function isolateNumeral(text: string): string {
  return `${LRI}${text}${PDI}`;
}

/** Formats an integer Rial amount with thousands separators and Persian digits, e.g. ۱۲۳,۴۵۶,۷۸۹ ریال. */
export function formatRial(amount: number): string {
  return `${isolateNumeral(toPersianDigits(numberFormatter.format(Math.round(amount))))} ریال`;
}

export function formatNumber(value: number): string {
  return isolateNumeral(toPersianDigits(numberFormatter.format(value)));
}
