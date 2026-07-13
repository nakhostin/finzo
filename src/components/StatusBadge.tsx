import type { EntryStatus, ChequeStatus } from "@/types/entities";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<EntryStatus, string> = {
  pending: "در انتظار",
  paid: "پرداخت‌شده",
  partial: "پرداخت جزئی",
  skipped: "رد شده",
  overdue: "معوق",
};

const STATUS_CLASSES: Record<EntryStatus, string> = {
  pending: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  skipped: "bg-neutral-100 text-neutral-400 line-through dark:bg-neutral-800",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export function StatusBadge({ status }: { status: EntryStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_CLASSES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

const CHEQUE_STATUS_LABELS: Record<ChequeStatus, string> = {
  "in-hand": "در اختیار",
  deposited: "واگذارشده به بانک",
  cleared: "پاس‌شده",
  bounced: "برگشت‌خورده",
  cancelled: "باطل‌شده",
};

const CHEQUE_STATUS_CLASSES: Record<ChequeStatus, string> = {
  "in-hand": "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  deposited: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  cleared: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  bounced: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  cancelled: "bg-neutral-100 text-neutral-400 line-through dark:bg-neutral-800",
};

export function ChequeStatusBadge({ status }: { status: ChequeStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        CHEQUE_STATUS_CLASSES[status],
      )}
    >
      {CHEQUE_STATUS_LABELS[status]}
    </span>
  );
}
