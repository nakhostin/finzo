import { useMemo, useState } from "react";
import { Check, Plus, Landmark } from "lucide-react";
import type { ItemType, LedgerEntry, Cheque, JalaliDate } from "@/types/entities";
import { daysInMonth, today, weekdayIndex, WEEKDAY_NAMES_FA, toPersianDigits } from "@/domain/jalali";
import { formatRial } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { ChequeStatusBadge } from "@/components/StatusBadge";
import { EntryDetailDialog } from "@/features/dashboard/EntryDetailDialog";
import { RecurringItemForm } from "@/features/recurring-items/RecurringItemForm";
import { ChequeForm } from "@/features/cheques/ChequeForm";

const TYPE_LABELS: Record<ItemType, string> = {
  debt: "بدهی",
  installment: "قسط",
  income: "درآمد",
  expense: "هزینه",
  receivable: "بستانکاری",
};

const TYPE_TONE: Record<ItemType, string> = {
  income: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-400/20",
  debt: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-400/20",
  installment: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-400/20",
  receivable: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-400/20",
  expense: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-400/20",
};

const TYPE_DOT: Record<ItemType, string> = {
  income: "bg-emerald-500",
  debt: "bg-red-500",
  installment: "bg-red-500",
  receivable: "bg-blue-500",
  expense: "bg-amber-500",
};

const CHEQUE_TONE =
  "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-400/20";

const MAX_VISIBLE_PER_DAY = 3;

type DayItem =
  | { kind: "entry"; id: string; entry: LedgerEntry }
  | { kind: "cheque"; id: string; cheque: Cheque };

export function MonthCalendar({
  entries,
  cheques,
  year,
  month,
}: {
  entries: LedgerEntry[];
  cheques: Cheque[];
  year: number;
  month: number;
}) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [addDay, setAddDay] = useState<number | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [chequeFormTarget, setChequeFormTarget] = useState<{ cheque?: Cheque; defaultDueDate?: JalaliDate } | null>(
    null,
  );
  const [newItemDate, setNewItemDate] = useState<JalaliDate | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<number, DayItem[]>();
    const push = (day: number, item: DayItem) => {
      const list = map.get(day) ?? [];
      list.push(item);
      map.set(day, list);
    };
    for (const entry of [...entries].sort((a, b) => a.priority - b.priority)) {
      push(entry.dueDay, { kind: "entry", id: entry.id, entry });
    }
    for (const cheque of cheques) {
      push(cheque.dueJalaliDate.day, { kind: "cheque", id: cheque.id, cheque });
    }
    return map;
  }, [entries, cheques]);

  const totalDays = daysInMonth(year, month);
  const leading = weekdayIndex({ year, month, day: 1 });
  const cellCount = Math.ceil((leading + totalDays) / 7) * 7;

  const todayDate = today();
  const isCurrentMonth = todayDate.year === year && todayDate.month === month;

  const days: (number | null)[] = Array.from({ length: cellCount }, (_, i) => {
    const day = i - leading + 1;
    return day >= 1 && day <= totalDays ? day : null;
  });

  const openEntry = (entry: LedgerEntry) => {
    setExpandedDay(null);
    setSelectedEntry(entry);
  };
  const openCheque = (cheque: Cheque) => {
    setExpandedDay(null);
    setChequeFormTarget({ cheque });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200/80 shadow-sm dark:border-neutral-800">
      <div className="grid grid-cols-7 gap-px bg-neutral-100 dark:bg-neutral-800">
        {WEEKDAY_NAMES_FA.map((w, i) => (
          <div
            key={w}
            className={cn(
              "bg-slate-50 py-2 text-center text-xs font-semibold dark:bg-neutral-900/60",
              i === 6 ? "text-red-500/80 dark:text-red-400/70" : "text-neutral-500 dark:text-neutral-400",
            )}
          >
            {w}
          </div>
        ))}

        {days.map((day, i) => {
          if (day === null) {
            return <div key={i} className="min-h-28 bg-neutral-50/60 dark:bg-neutral-900/20" />;
          }
          const isToday = isCurrentMonth && day === todayDate.day;
          const isFriday = i % 7 === 6;
          const dayItems = byDay.get(day) ?? [];
          const visible = dayItems.slice(0, MAX_VISIBLE_PER_DAY);
          const hidden = dayItems.length - visible.length;

          return (
            <div
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => setAddDay(day)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setAddDay(day);
              }}
              title="افزودن مورد جدید برای این روز"
              className={cn(
                "flex min-h-28 cursor-pointer flex-col gap-1 bg-white p-1.5 transition-colors hover:bg-slate-50 dark:bg-neutral-900 dark:hover:bg-neutral-800/50",
                isToday && "bg-blue-50/70 hover:bg-blue-50 dark:bg-blue-950/30 dark:hover:bg-blue-950/40",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                    isToday
                      ? "bg-blue-600 text-white"
                      : isFriday
                        ? "text-red-500/80 dark:text-red-400/70"
                        : "text-neutral-600 dark:text-neutral-300",
                  )}
                >
                  {toPersianDigits(day)}
                </span>
                <Plus size={13} className="text-neutral-300 dark:text-neutral-600" />
              </div>

              <div className="flex flex-1 flex-col gap-1">
                {visible.map((item) =>
                  item.kind === "entry" ? (
                    <EntryChip
                      key={item.id}
                      entry={item.entry}
                      isOverdue={isCurrentMonth && item.entry.status === "pending" && day < todayDate.day}
                      onSelect={() => openEntry(item.entry)}
                    />
                  ) : (
                    <ChequeChip key={item.id} cheque={item.cheque} onSelect={() => openCheque(item.cheque)} />
                  ),
                )}
                {hidden > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedDay(day);
                    }}
                    className="rounded px-1 text-start text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    + {toPersianDigits(hidden)} مورد دیگر
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {expandedDay !== null && (
        <DayDetailsDialog
          day={expandedDay}
          items={byDay.get(expandedDay) ?? []}
          onClose={() => setExpandedDay(null)}
          onSelectEntry={openEntry}
          onSelectCheque={openCheque}
        />
      )}

      {addDay !== null && (
        <AddChooserDialog
          day={addDay}
          onClose={() => setAddDay(null)}
          onChooseItem={() => {
            setNewItemDate({ year, month, day: addDay });
            setAddDay(null);
          }}
          onChooseCheque={() => {
            setChequeFormTarget({ defaultDueDate: { year, month, day: addDay } });
            setAddDay(null);
          }}
        />
      )}

      {selectedEntry && <EntryDetailDialog entry={selectedEntry} onOpenChange={(o) => !o && setSelectedEntry(null)} />}

      <ChequeForm
        open={chequeFormTarget !== null}
        onOpenChange={(o) => !o && setChequeFormTarget(null)}
        cheque={chequeFormTarget?.cheque}
        defaultDueDate={chequeFormTarget?.defaultDueDate}
        onSaved={() => setChequeFormTarget(null)}
      />

      <RecurringItemForm
        open={newItemDate !== null}
        onOpenChange={(o) => !o && setNewItemDate(null)}
        defaultDate={newItemDate ?? undefined}
        onSaved={() => setNewItemDate(null)}
      />
    </div>
  );
}

function EntryChip({
  entry,
  isOverdue,
  onSelect,
}: {
  entry: LedgerEntry;
  isOverdue: boolean;
  onSelect: () => void;
}) {
  const isDone = entry.status === "paid";
  const isSkipped = entry.status === "skipped";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      title={`${entry.title} — ${TYPE_LABELS[entry.type]} — ${formatRial(entry.amountActual ?? entry.amountPlanned)}`}
      className={cn(
        "flex w-full items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-start text-[11px] font-medium ring-1 ring-inset transition-transform hover:scale-[1.02]",
        TYPE_TONE[entry.type],
        isDone && "opacity-60",
        isSkipped && "opacity-50 line-through",
        isOverdue && "ring-2 ring-red-500",
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TYPE_DOT[entry.type])} />
      <span className="truncate">{entry.title}</span>
      {isDone && <Check size={11} className="ms-auto shrink-0" />}
    </button>
  );
}

function ChequeChip({ cheque, onSelect }: { cheque: Cheque; onSelect: () => void }) {
  const isSettled = cheque.status === "cleared" || cheque.status === "cancelled";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      title={`چک ${cheque.chequeNumber} — ${formatRial(cheque.amount)}`}
      className={cn(
        "flex w-full items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-start text-[11px] font-medium ring-1 ring-inset transition-transform hover:scale-[1.02]",
        CHEQUE_TONE,
        isSettled && "opacity-60",
        cheque.status === "bounced" && "ring-2 ring-red-500",
      )}
    >
      <Landmark size={11} className="shrink-0" />
      <span className="truncate">چک {toPersianDigits(cheque.chequeNumber)}</span>
    </button>
  );
}

function DayDetailsDialog({
  day,
  items,
  onClose,
  onSelectEntry,
  onSelectCheque,
}: {
  day: number;
  items: DayItem[];
  onClose: () => void;
  onSelectEntry: (entry: LedgerEntry) => void;
  onSelectCheque: (cheque: Cheque) => void;
}) {
  return (
    <Dialog open onOpenChange={onClose} title={`سررسیدهای روز ${toPersianDigits(day)}`}>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => (item.kind === "entry" ? onSelectEntry(item.entry) : onSelectCheque(item.cheque))}
            className="flex items-center justify-between gap-2 rounded-lg border border-neutral-100 p-2 text-start transition-colors hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-800/60"
          >
            {item.kind === "entry" ? (
              <>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.entry.title}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{TYPE_LABELS[item.entry.type]}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold">
                  {formatRial(item.entry.amountActual ?? item.entry.amountPlanned)}
                </p>
              </>
            ) : (
              <>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">چک {toPersianDigits(item.cheque.chequeNumber)}</p>
                  <ChequeStatusBadge status={item.cheque.status} />
                </div>
                <p className="shrink-0 text-sm font-semibold">{formatRial(item.cheque.amount)}</p>
              </>
            )}
          </button>
        ))}
      </div>
    </Dialog>
  );
}

function AddChooserDialog({
  day,
  onClose,
  onChooseItem,
  onChooseCheque,
}: {
  day: number;
  onClose: () => void;
  onChooseItem: () => void;
  onChooseCheque: () => void;
}) {
  return (
    <Dialog open onOpenChange={onClose} title={`افزودن مورد جدید برای روز ${toPersianDigits(day)}`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onChooseItem}
          className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 p-4 text-center transition-colors hover:border-blue-500 hover:bg-blue-50 dark:border-neutral-800 dark:hover:bg-blue-950/30"
        >
          <Plus size={20} className="text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold">بدهی / قسط / درآمد / هزینه</span>
        </button>
        <button
          type="button"
          onClick={onChooseCheque}
          className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 p-4 text-center transition-colors hover:border-violet-500 hover:bg-violet-50 dark:border-neutral-800 dark:hover:bg-violet-950/30"
        >
          <Landmark size={20} className="text-violet-600 dark:text-violet-400" />
          <span className="text-sm font-semibold">چک جدید</span>
        </button>
      </div>
    </Dialog>
  );
}
