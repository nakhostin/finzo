import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router";
import { ListChecks, Repeat, Landmark, ChevronLeft, type LucideIcon } from "lucide-react";
import { getCashFlowBreakdown, listEntriesForMonth } from "@/db/repositories/ledgerEntries";
import { listChequesForMonth } from "@/db/repositories/cheques";
import { useUiStore } from "@/stores/uiStore";
import { today, monthLabel, toPersianDigits } from "@/domain/jalali";
import { cardLinkClassName } from "@/lib/cardStyles";
import { cn } from "@/lib/utils";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { MonthCalendar } from "@/features/dashboard/MonthCalendar";
import { CashFlowSummaryCard } from "@/features/dashboard/CashFlowSummaryCard";

export function DashboardPage() {
  const todayDate = today();
  const { selectedYear, selectedMonth } = useUiStore();

  const cashFlow = useLiveQuery(
    () => getCashFlowBreakdown(selectedYear, selectedMonth),
    [selectedYear, selectedMonth],
  );
  const monthEntries = useLiveQuery(
    () => listEntriesForMonth(selectedYear, selectedMonth),
    [selectedYear, selectedMonth],
  );
  const monthCheques = useLiveQuery(
    () => listChequesForMonth(selectedYear, selectedMonth),
    [selectedYear, selectedMonth],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">داشبورد</h2>
          <p className="text-neutral-500 dark:text-neutral-400">
            امروز: {toPersianDigits(todayDate.day)} {monthLabel(todayDate.month)}{" "}
            {toPersianDigits(todayDate.year)}
          </p>
        </div>
        <MonthSwitcher />
      </div>

      <CashFlowSummaryCard breakdown={cashFlow} />

      <div>
        <h3 className="mb-3 text-lg font-semibold">
          تقویم سررسیدهای {monthLabel(selectedMonth)} {toPersianDigits(selectedYear)}
        </h3>
        <MonthCalendar
          entries={monthEntries ?? []}
          cheques={monthCheques ?? []}
          year={selectedYear}
          month={selectedMonth}
        />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <QuickLinkCard
            to="/checklist"
            icon={ListChecks}
            label="چک‌لیست ماه"
            description="بررسی و علامت‌زدن پرداخت‌های این ماه"
          />
          <QuickLinkCard
            to="/recurring"
            icon={Repeat}
            label="مدیریت آیتم‌های تکرارشونده"
            description="افزودن و ویرایش قالب‌های بدهی، قسط و درآمد"
          />
          <QuickLinkCard
            to="/cheques"
            icon={Landmark}
            label="مدیریت چک‌ها"
            description="مشاهده و ویرایش همه چک‌های صادره و دریافتی"
          />
        </div>
      </div>
    </div>
  );
}

function QuickLinkCard({
  to,
  icon: Icon,
  label,
  description,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  description: string;
}) {
  return (
    <Link to={to} className={cn(cardLinkClassName, "flex items-center gap-3")}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{description}</span>
      </span>
      <ChevronLeft size={16} className="shrink-0 text-neutral-300 dark:text-neutral-600" />
    </Link>
  );
}
