import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { listEntriesForMonth, setEntryStatus, updateLedgerEntry } from "@/db/repositories/ledgerEntries";
import { listCategories } from "@/db/repositories/categories";
import { listPeople } from "@/db/repositories/people";
import { useUiStore } from "@/stores/uiStore";
import { today } from "@/domain/jalali";
import { formatRial, formatNumber } from "@/lib/format";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { AmountInput } from "@/components/ui/amount-input";
import type { LedgerEntry } from "@/types/entities";

const TYPE_LABELS: Record<LedgerEntry["type"], string> = {
  debt: "بدهی",
  installment: "قسط",
  income: "درآمد",
  expense: "هزینه",
  receivable: "بستانکاری",
};

export function MonthlyChecklist() {
  const { selectedYear, selectedMonth } = useUiStore();
  const entries = useLiveQuery(
    () => listEntriesForMonth(selectedYear, selectedMonth),
    [selectedYear, selectedMonth],
    [],
  );
  const categories = useLiveQuery(() => listCategories(), [], []);
  const people = useLiveQuery(() => listPeople(), [], []);
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
  const [editingAmountValue, setEditingAmountValue] = useState<number | undefined>(undefined);

  const categoryName = useMemo(() => {
    const map = new Map((categories ?? []).map((c) => [c.id, c.nameFa]));
    return (id?: string) => (id ? map.get(id) : undefined);
  }, [categories]);

  const personName = useMemo(() => {
    const map = new Map((people ?? []).map((p) => [p.id, p.name]));
    return (id?: string) => (id ? map.get(id) : undefined);
  }, [people]);

  const sorted = useMemo(
    () => [...(entries ?? [])].sort((a, b) => a.priority - b.priority || a.dueDay - b.dueDay),
    [entries],
  );

  const isCurrentMonth = useMemo(() => {
    const t = today();
    return t.year === selectedYear && t.month === selectedMonth;
  }, [selectedYear, selectedMonth]);

  const todayDay = today().day;

  if (entries && entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
        برای این ماه هیچ آیتمی ثبت نشده است.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200/80 shadow-sm dark:border-neutral-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400">
          <tr>
            <th className="w-10 p-3"></th>
            <th className="p-3 text-start">عنوان</th>
            <th className="p-3 text-start">نوع</th>
            <th className="p-3 text-start">دسته / شخص</th>
            <th className="p-3 text-start">روز سررسید</th>
            <th className="p-3 text-start">مبلغ</th>
            <th className="p-3 text-start">وضعیت</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry) => {
            const overdue =
              isCurrentMonth && entry.status === "pending" && entry.dueDay < todayDay;
            return (
              <tr
                key={entry.id}
                className="border-t border-neutral-100 transition-colors hover:bg-slate-50/70 dark:border-neutral-800 dark:hover:bg-neutral-800/40"
              >
                <td className="p-3">
                  <Checkbox
                    checked={entry.status === "paid"}
                    onCheckedChange={(checked) =>
                      setEntryStatus(entry.id, checked ? "paid" : "pending", checked ? today() : undefined)
                    }
                    aria-label="پرداخت‌شده"
                  />
                </td>
                <td className="p-3 font-medium">{entry.title}</td>
                <td className="p-3 text-neutral-500 dark:text-neutral-400">
                  {TYPE_LABELS[entry.type]}
                </td>
                <td className="p-3 text-neutral-500 dark:text-neutral-400">
                  {[categoryName(entry.categoryId), personName(entry.personId)]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>
                <td className={overdue ? "p-3 font-semibold text-red-600" : "p-3"}>
                  {formatNumber(entry.dueDay)}
                </td>
                <td className="p-3">
                  {editingAmountId === entry.id ? (
                    <AmountInput
                      autoFocus
                      value={editingAmountValue}
                      onChange={setEditingAmountValue}
                      className="w-32 px-2 py-1"
                      onBlur={() => {
                        if (editingAmountValue !== undefined) {
                          updateLedgerEntry(entry.id, { amountActual: editingAmountValue });
                        }
                        setEditingAmountId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="rounded px-1 py-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      onClick={() => {
                        setEditingAmountValue(entry.amountActual ?? entry.amountPlanned);
                        setEditingAmountId(entry.id);
                      }}
                    >
                      {formatRial(entry.amountActual ?? entry.amountPlanned)}
                    </button>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={overdue ? "overdue" : entry.status} />
                    {entry.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEntryStatus(entry.id, "skipped")}
                      >
                        رد شدن
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
