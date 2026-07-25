import { TrendingDown, TrendingUp, Scale, Hourglass, type LucideIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cardClassName } from "@/lib/cardStyles";
import { cn } from "@/lib/utils";
import { formatRial, formatNumber } from "@/lib/format";
import type { ChecklistTotals } from "@/domain/checklistTotals";

export type SummaryScope = "priority" | "all";

interface ChecklistSummaryCardProps {
  scope: SummaryScope;
  onScopeChange: (scope: SummaryScope) => void;
  priorityTotals: ChecklistTotals;
  allTotals: ChecklistTotals;
  /** Human-readable span of the current view, e.g. "مهر ۱۴۰۵ تا آذر ۱۴۰۵". */
  rangeLabel: string;
}

export function ChecklistSummaryCard({
  scope,
  onScopeChange,
  priorityTotals,
  allTotals,
  rangeLabel,
}: ChecklistSummaryCardProps) {
  const totals = scope === "priority" ? priorityTotals : allTotals;

  return (
    <div className={cn(cardClassName, "p-5")}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">
            {scope === "priority" ? "جمع آیتم‌های اولویت‌دار" : "جمع همهٔ آیتم‌ها"}
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {rangeLabel} · {formatNumber(totals.count)} آیتم از {formatNumber(allTotals.count)}
          </p>
        </div>
        <Tabs value={scope} onValueChange={(value) => onScopeChange(value as SummaryScope)}>
          <TabsList>
            <TabsTrigger value="priority">اولویت‌دارها</TabsTrigger>
            <TabsTrigger value="all">همه</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {scope === "priority" && priorityTotals.count === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700">
          هنوز آیتمی را به‌عنوان اولویت انتخاب نکرده‌اید. با ستارهٔ کنار هر ردیف آن را انتخاب کنید تا
          جمع کل اینجا نمایش داده شود.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatBox icon={TrendingDown} label="جمع پرداختی‌ها" value={totals.totalOut} tone="danger" />
          <StatBox icon={TrendingUp} label="جمع دریافتی‌ها" value={totals.totalIn} tone="success" />
          <StatBox
            icon={Hourglass}
            label="باقیماندهٔ پرداخت‌نشده"
            value={totals.remainingOut}
            tone="warning"
          />
          <StatBox
            icon={Scale}
            label="مانده خالص"
            value={totals.net}
            tone={totals.net < 0 ? "danger" : "success"}
          />
        </div>
      )}
    </div>
  );
}

type Tone = "success" | "danger" | "warning";

const TEXT_CLASSES: Record<Tone, string> = {
  success: "text-emerald-600 dark:text-emerald-400",
  danger: "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
};

const BADGE_CLASSES: Record<Tone, string> = {
  success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  danger: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
};

function StatBox({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: Tone;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200/80 p-3 dark:border-neutral-800">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          BADGE_CLASSES[tone],
        )}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
        <p className={cn("mt-0.5 text-lg font-bold", TEXT_CLASSES[tone])}>{formatRial(value)}</p>
      </div>
    </div>
  );
}
