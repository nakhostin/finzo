import { useState } from "react";
import { TrendingUp, TrendingDown, Scale, ChevronDown, ChevronUp, type LucideIcon } from "lucide-react";
import { cardClassName } from "@/lib/cardStyles";
import { cn } from "@/lib/utils";
import { formatRial } from "@/lib/format";
import type { CashFlowBreakdown } from "@/db/repositories/ledgerEntries";

export function CashFlowSummaryCard({ breakdown }: { breakdown: CashFlowBreakdown | undefined }) {
  const [expanded, setExpanded] = useState(false);
  const net = breakdown?.net;

  return (
    <div className={cn(cardClassName, "p-5")}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold">جریان نقدی این ماه</h3>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-slate-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {expanded ? "بستن جزئیات" : "نمایش جزئیات"}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatBox icon={TrendingUp} label="کل ورودی" value={breakdown?.totalIn} tone="success" />
        <StatBox icon={TrendingDown} label="کل خروجی" value={breakdown?.totalOut} tone="danger" />
        <StatBox
          icon={Scale}
          label="مانده خالص"
          value={net}
          tone={net !== undefined && net < 0 ? "danger" : "success"}
        />
      </div>

      {expanded && (
        <div className="mt-4 grid grid-cols-1 gap-5 border-t border-neutral-100 pt-4 dark:border-neutral-800 sm:grid-cols-2">
          <BreakdownGroup
            title="جزئیات ورودی"
            tone="success"
            rows={[
              { label: "درآمد", value: breakdown?.income },
              { label: "بستانکاری", value: breakdown?.receivable },
              { label: "چک‌های دریافتی", value: breakdown?.chequesIn },
            ]}
          />
          <BreakdownGroup
            title="جزئیات خروجی"
            tone="danger"
            rows={[
              { label: "بدهی", value: breakdown?.debt },
              { label: "اقساط", value: breakdown?.installment },
              { label: "هزینه‌ها", value: breakdown?.expense },
              { label: "چک‌های پرداختی", value: breakdown?.chequesOut },
            ]}
          />
        </div>
      )}
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number | undefined;
  tone: "success" | "danger";
}) {
  const textClass = tone === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
  const badgeClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
      : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200/80 p-3 dark:border-neutral-800">
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", badgeClass)}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
        <p className={cn("mt-0.5 text-lg font-bold", textClass)}>
          {value === undefined ? "…" : formatRial(value)}
        </p>
      </div>
    </div>
  );
}

function BreakdownGroup({
  title,
  tone,
  rows,
}: {
  title: string;
  tone: "success" | "danger";
  rows: Array<{ label: string; value: number | undefined }>;
}) {
  const dotClass = tone === "success" ? "bg-emerald-500" : "bg-red-500";

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">{title}</p>
      <div className="space-y-1">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-neutral-800/50"
          >
            <span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", dotClass)} />
              {row.label}
            </span>
            <span className="font-semibold tabular-nums">
              {row.value === undefined ? "…" : formatRial(row.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
