import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Star, ListChecks, Eraser } from "lucide-react";
import {
  listEntriesForRange,
  setEntriesPriority,
  setEntryPriority,
  setEntryStatus,
  updateLedgerEntry,
} from "@/db/repositories/ledgerEntries";
import { listCategories } from "@/db/repositories/categories";
import { listPeople } from "@/db/repositories/people";
import { useUiStore } from "@/stores/uiStore";
import { compareYearMonth, monthLabel, today, toPersianDigits } from "@/domain/jalali";
import { summarizeEntries } from "@/domain/checklistTotals";
import { formatRial, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { AmountInput } from "@/components/ui/amount-input";
import {
  ChecklistSummaryCard,
  type SummaryScope,
} from "@/features/recurring-items/ChecklistSummaryCard";
import type { LedgerEntry } from "@/types/entities";

const TYPE_LABELS: Record<LedgerEntry["type"], string> = {
  debt: "بدهی",
  installment: "قسط",
  income: "درآمد",
  expense: "هزینه",
  receivable: "بستانکاری",
};

const COLUMN_COUNT = 8;

function monthTitle(year: number, month: number): string {
  return `${monthLabel(month)} ${toPersianDigits(year)}`;
}

export function MonthlyChecklist() {
  const { selectedYear, selectedMonth, checklistRangeEnd } = useUiStore();
  const [onlyPriority, setOnlyPriority] = useState(false);
  const [scope, setScope] = useState<SummaryScope>("priority");
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
  const [editingAmountValue, setEditingAmountValue] = useState<number | undefined>(undefined);

  // A range end earlier than the start would query an empty span; clamp it to
  // the start so the view degrades to that single month instead of going blank.
  const from = { year: selectedYear, month: selectedMonth };
  const to =
    checklistRangeEnd && compareYearMonth(checklistRangeEnd, from) > 0 ? checklistRangeEnd : from;
  const isRange = compareYearMonth(from, to) !== 0;

  const entries = useLiveQuery(
    () => listEntriesForRange({ year: from.year, month: from.month }, { year: to.year, month: to.month }),
    [from.year, from.month, to.year, to.month],
    [],
  );
  const categories = useLiveQuery(() => listCategories(), [], []);
  const people = useLiveQuery(() => listPeople(), [], []);

  const categoryName = useMemo(() => {
    const map = new Map((categories ?? []).map((c) => [c.id, c.nameFa]));
    return (id?: string) => (id ? map.get(id) : undefined);
  }, [categories]);

  const personName = useMemo(() => {
    const map = new Map((people ?? []).map((p) => [p.id, p.name]));
    return (id?: string) => (id ? map.get(id) : undefined);
  }, [people]);

  const all = useMemo(() => entries ?? [], [entries]);

  const allTotals = useMemo(() => summarizeEntries(all), [all]);
  const priorityEntries = useMemo(() => all.filter((e) => e.isPriority), [all]);
  const priorityTotals = useMemo(() => summarizeEntries(priorityEntries), [priorityEntries]);

  const visible = useMemo(() => {
    const rows = onlyPriority ? priorityEntries : all;
    return [...rows].sort(
      (a, b) =>
        compareYearMonth(
          { year: a.jalaliYear, month: a.jalaliMonth },
          { year: b.jalaliYear, month: b.jalaliMonth },
        ) ||
        a.priority - b.priority ||
        a.dueDay - b.dueDay,
    );
  }, [all, priorityEntries, onlyPriority]);

  /** Visible rows split into per-month blocks (one block in single-month mode). */
  const groups = useMemo(() => {
    const buckets = new Map<string, { year: number; month: number; rows: LedgerEntry[] }>();
    for (const entry of visible) {
      const key = `${entry.jalaliYear}-${entry.jalaliMonth}`;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { year: entry.jalaliYear, month: entry.jalaliMonth, rows: [] };
        buckets.set(key, bucket);
      }
      bucket.rows.push(entry);
    }
    return [...buckets.values()];
  }, [visible]);

  const rangeLabel = isRange
    ? `${monthTitle(from.year, from.month)} تا ${monthTitle(to.year, to.month)}`
    : monthTitle(from.year, from.month);

  const todayDate = today();
  const isCurrentMonth = (year: number, month: number) =>
    todayDate.year === year && todayDate.month === month;

  const allVisibleMarked = visible.length > 0 && visible.every((e) => e.isPriority);

  return (
    <div className="space-y-4">
      <ChecklistSummaryCard
        scope={scope}
        onScopeChange={setScope}
        priorityTotals={priorityTotals}
        allTotals={allTotals}
        rangeLabel={rangeLabel}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant={onlyPriority ? "primary" : "secondary"}
          size="sm"
          onClick={() => setOnlyPriority((v) => !v)}
        >
          <Star size={14} className={onlyPriority ? "fill-current" : undefined} />
          {onlyPriority ? "نمایش همهٔ آیتم‌ها" : "فقط اولویت‌دارها"}
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={visible.length === 0}
            onClick={() =>
              setEntriesPriority(
                visible.map((e) => e.id),
                !allVisibleMarked,
              )
            }
          >
            <ListChecks size={14} />
            {allVisibleMarked ? "برداشتن انتخاب همه" : "انتخاب همه"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={priorityEntries.length === 0}
            onClick={() => {
              setEntriesPriority(
                priorityEntries.map((e) => e.id),
                false,
              );
              setOnlyPriority(false);
            }}
          >
            <Eraser size={14} />
            پاک کردن اولویت‌ها
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
          {onlyPriority
            ? "در این بازه آیتم اولویت‌داری انتخاب نشده است."
            : isRange
              ? "برای این بازه هیچ آیتمی ثبت نشده است."
              : "برای این ماه هیچ آیتمی ثبت نشده است."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200/80 shadow-sm dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400">
              <tr>
                <th className="w-10 p-3" title="اولویت">
                  <Star size={14} className="mx-auto" />
                </th>
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
              {groups.map((group) => {
                const groupTotals = summarizeEntries(group.rows);
                const groupPriorityTotals = summarizeEntries(group.rows.filter((e) => e.isPriority));
                return [
                  isRange ? (
                    <tr
                      key={`head-${group.year}-${group.month}`}
                      className="border-t border-neutral-200 bg-blue-50/60 dark:border-neutral-800 dark:bg-blue-950/20"
                    >
                      <td colSpan={COLUMN_COUNT} className="px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-blue-800 dark:text-blue-300">
                            {monthTitle(group.year, group.month)}
                            <span className="ms-2 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                              · {formatNumber(group.rows.length)} آیتم
                            </span>
                          </span>
                          <span className="flex flex-wrap items-center gap-3 text-xs">
                            {groupPriorityTotals.count > 0 && (
                              <span className="text-blue-700 dark:text-blue-300">
                                اولویت‌دارها: <strong>{formatRial(groupPriorityTotals.totalOut)}</strong>
                              </span>
                            )}
                            <span className="text-neutral-500 dark:text-neutral-400">
                              جمع پرداختی: <strong>{formatRial(groupTotals.totalOut)}</strong>
                            </span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : null,
                  ...group.rows.map((entry) => {
                    const overdue =
                      isCurrentMonth(entry.jalaliYear, entry.jalaliMonth) &&
                      entry.status === "pending" &&
                      entry.dueDay < todayDate.day;
                    return (
                      <tr
                        key={entry.id}
                        className={cn(
                          "border-t border-neutral-100 transition-colors dark:border-neutral-800",
                          entry.isPriority
                            ? "bg-blue-50/40 hover:bg-blue-50/80 dark:bg-blue-950/10 dark:hover:bg-blue-950/25"
                            : "hover:bg-slate-50/70 dark:hover:bg-neutral-800/40",
                        )}
                      >
                        <td className="p-3">
                          <button
                            type="button"
                            aria-label={entry.isPriority ? "برداشتن از اولویت‌ها" : "افزودن به اولویت‌ها"}
                            aria-pressed={entry.isPriority === true}
                            onClick={() => setEntryPriority(entry.id, !entry.isPriority)}
                            className={cn(
                              "flex size-7 items-center justify-center rounded-md transition-colors",
                              entry.isPriority
                                ? "text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/40"
                                : "text-neutral-300 hover:bg-neutral-100 hover:text-neutral-500 dark:text-neutral-600 dark:hover:bg-neutral-800",
                            )}
                          >
                            <Star size={16} className={entry.isPriority ? "fill-current" : undefined} />
                          </button>
                        </td>
                        <td className="p-3">
                          <Checkbox
                            checked={entry.status === "paid"}
                            onCheckedChange={(checked) =>
                              setEntryStatus(
                                entry.id,
                                checked ? "paid" : "pending",
                                checked ? todayDate : undefined,
                              )
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
                  }),
                ];
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
