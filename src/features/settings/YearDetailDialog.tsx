import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { RefreshCw, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { listEntriesForYear } from "@/db/repositories/ledgerEntries";
import { updateJalaliYear, deleteJalaliYear } from "@/db/repositories/jalaliYears";
import { ensureYearsGenerated } from "@/domain/recurrence";
import { formatRial } from "@/lib/format";
import { toPersianDigits } from "@/domain/jalali";
import type { JalaliYearRecord } from "@/types/entities";

interface YearDetailDialogProps {
  year: JalaliYearRecord;
  onClose: () => void;
}

export function YearDetailDialog({ year, onClose }: YearDetailDialogProps) {
  const entries = useLiveQuery(() => listEntriesForYear(year.year), [year.year]);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const totals = useMemo(
    () =>
      (entries ?? []).reduce(
        (acc, e) => {
          if (e.status === "skipped") return acc;
          const amount = e.amountActual ?? e.amountPlanned;
          if (e.type === "income") acc.income += amount;
          else if (e.type === "debt" || e.type === "installment") acc.debt += amount;
          else if (e.type === "receivable") acc.receivable += amount;
          else acc.expense += amount;
          return acc;
        },
        { debt: 0, income: 0, receivable: 0, expense: 0 },
      ),
    [entries],
  );

  const handleToggleActive = async () => {
    await updateJalaliYear(year.year, { isActive: !year.isActive });
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await ensureYearsGenerated([year.year]);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDelete = async () => {
    const count = entries?.length ?? 0;
    if (
      confirm(
        `سال مالی ${year.year} حذف شود؟ این کار ${count} سررسید ثبت‌شده در این سال را هم برای همیشه حذف می‌کند.`,
      )
    ) {
      await deleteJalaliYear(year.year);
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={onClose} title={`جزئیات سال مالی ${toPersianDigits(year.year)}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <span className="text-sm font-medium">وضعیت</span>
          <button
            type="button"
            onClick={handleToggleActive}
            className={
              year.isActive
                ? "rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800"
            }
          >
            {year.isActive ? "فعال" : "غیرفعال"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatBox label="درآمد" value={totals.income} tone="success" />
          <StatBox label="بدهی و اقساط" value={totals.debt} tone="danger" />
          <StatBox label="هزینه‌ها" value={totals.expense} tone="neutral" />
          <StatBox label="بستانکاری" value={totals.receivable} tone="neutral" />
        </div>

        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          تعداد سررسیدهای ثبت‌شده در این سال: {toPersianDigits(entries?.length ?? 0)}
        </p>

        <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <Button variant="secondary" onClick={handleRegenerate} disabled={isRegenerating}>
            <RefreshCw size={16} />
            به‌روزرسانی آیتم‌های تکرارشونده
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            <Trash2 size={16} />
            حذف سال مالی
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "danger" | "neutral";
}) {
  const toneClass = {
    danger: "text-red-600 dark:text-red-400",
    success: "text-emerald-600 dark:text-emerald-400",
    neutral: "text-neutral-700 dark:text-neutral-300",
  }[tone];
  return (
    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className={`mt-1 text-sm font-bold ${toneClass}`}>{formatRial(value)}</p>
    </div>
  );
}
