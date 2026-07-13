import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { db } from "@/db/db";
import { listCategories } from "@/db/repositories/categories";
import { listShoppingItems } from "@/db/repositories/shopping";
import {
  cashFlowByCategory,
  chequeStatusSummary,
  yearlyComparison,
  netWorthTrend,
  currentNetWorth,
} from "@/domain/reports";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChequeStatusBadge } from "@/components/StatusBadge";
import { formatRial, formatNumber } from "@/lib/format";
import { today, monthLabel, toPersianDigits } from "@/domain/jalali";
import { CHART_COLORS } from "@/features/reports/chartColors";

export function ReportsPage() {
  const [year, setYear] = useState(today().year);

  const entries = useLiveQuery(() => db.ledgerEntries.toArray(), [], []);
  const cheques = useLiveQuery(() => db.cheques.toArray(), [], []);
  const categories = useLiveQuery(() => listCategories(), [], []);
  const accounts = useLiveQuery(() => db.accounts.toArray(), [], []);
  const assetTypes = useLiveQuery(() => db.assetTypes.toArray(), [], []);
  const assetLots = useLiveQuery(() => db.assetLots.toArray(), [], []);
  const rates = useLiveQuery(() => db.rateSnapshots.toArray(), [], []);
  const shoppingItems = useLiveQuery(() => listShoppingItems(), [], []);
  const netWorthNow = useLiveQuery(() => currentNetWorth(), []);

  const categoryName = useMemo(() => {
    const map = new Map((categories ?? []).map((c) => [c.id, c.nameFa]));
    return (id?: string) => (id ? (map.get(id) ?? "سایر") : "بدون دسته‌بندی");
  }, [categories]);

  const cashFlowData = useMemo(() => {
    const flows = cashFlowByCategory(entries ?? [], year);
    return flows
      .map((f) => ({ name: categoryName(f.categoryId), amount: f.amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [entries, year, categoryName]);

  const chequeSummary = useMemo(() => chequeStatusSummary(cheques ?? []), [cheques]);

  const yearlyData = useMemo(() => {
    const totals = yearlyComparison(entries ?? []);
    return totals.map((t) => ({
      year: toPersianDigits(t.year),
      درآمد: t.income,
      بدهی: t.debt,
      هزینه: t.expense,
    }));
  }, [entries]);

  const netWorthData = useMemo(() => {
    if (!entries || !assetLots || !rates || !assetTypes || !accounts) return [];
    const accountsInitialTotal = accounts.reduce((sum, a) => sum + a.initialBalance, 0);
    const points = netWorthTrend(
      entries,
      assetLots,
      rates,
      assetTypes.map((a) => a.id),
      accountsInitialTotal,
      year,
    );
    return points.map((p) => ({ name: monthLabel(p.month), netWorth: p.netWorth }));
  }, [entries, assetLots, rates, assetTypes, accounts, year]);

  const shoppingPendingTotal = useMemo(
    () =>
      (shoppingItems ?? [])
        .filter((i) => i.status === "wishlist" || i.status === "planned")
        .reduce((sum, i) => sum + (i.estimatedPrice ?? 0) * i.quantity, 0),
    [shoppingItems],
  );

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">گزارش‌ها</h2>

      <Tabs defaultValue="cashflow" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cashflow">هزینه به تفکیک دسته</TabsTrigger>
          <TabsTrigger value="years">مقایسه سال‌به‌سال</TabsTrigger>
          <TabsTrigger value="networth">روند ارزش خالص</TabsTrigger>
          <TabsTrigger value="cheques">وضعیت چک‌ها</TabsTrigger>
          <TabsTrigger value="shopping">خرید در برابر پس‌انداز</TabsTrigger>
        </TabsList>

        <TabsContent value="cashflow" className="space-y-3">
          <YearSwitcher year={year} setYear={setYear} />
          <div className="h-80 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            {cashFlowData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={cashFlowData} dataKey="amount" nameKey="name" outerRadius={100}>
                    {cashFlowData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(value) => formatRial(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="در این سال هزینه‌ای ثبت نشده است." />
            )}
          </div>
        </TabsContent>

        <TabsContent value="years" className="space-y-3">
          <div className="h-80 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            {yearlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(v) => formatNumber(v)} />
                  <Tooltip formatter={(value) => formatRial(Number(value))} />
                  <Bar dataKey="درآمد" fill={CHART_COLORS[0]} />
                  <Bar dataKey="بدهی" fill={CHART_COLORS[2]} />
                  <Bar dataKey="هزینه" fill={CHART_COLORS[1]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="داده‌ای برای مقایسه وجود ندارد." />
            )}
          </div>
        </TabsContent>

        <TabsContent value="networth" className="space-y-3">
          <YearSwitcher year={year} setYear={setYear} />
          <div className="h-80 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={netWorthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => formatNumber(v)} />
                <Tooltip formatter={(value) => formatRial(Number(value))} />
                <Line type="monotone" dataKey="netWorth" stroke={CHART_COLORS[0]} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {netWorthNow && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="موجودی نقدی" value={netWorthNow.cashPosition} />
              <StatCard label="بدهی باز" value={-netWorthNow.openDebt} tone="danger" />
              <StatCard label="طلب باز" value={netWorthNow.openReceivable} tone="success" />
              <StatCard label="ارزش دارایی‌ها" value={netWorthNow.assetsValue} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="cheques" className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-neutral-200/80 shadow-sm dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400">
                <tr>
                  <th className="p-3 text-start">وضعیت</th>
                  <th className="p-3 text-start">تعداد</th>
                  <th className="p-3 text-start">مجموع مبلغ</th>
                </tr>
              </thead>
              <tbody>
                {chequeSummary.map((s) => (
                  <tr key={s.status} className="border-t border-neutral-100 transition-colors hover:bg-slate-50/70 dark:border-neutral-800 dark:hover:bg-neutral-800/40">
                    <td className="p-3">
                      <ChequeStatusBadge status={s.status} />
                    </td>
                    <td className="p-3">{formatNumber(s.count)}</td>
                    <td className="p-3">{formatRial(s.totalAmount)}</td>
                  </tr>
                ))}
                {chequeSummary.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-neutral-500">
                      چکی ثبت نشده است.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="shopping" className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="مجموع تخمینی لیست خرید" value={shoppingPendingTotal} tone="danger" />
            <StatCard
              label="ارزش خالص فعلی"
              value={netWorthNow?.netWorth ?? 0}
              tone={(netWorthNow?.netWorth ?? 0) >= 0 ? "success" : "danger"}
            />
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {netWorthNow && shoppingPendingTotal > netWorthNow.netWorth
              ? "مجموع لیست خرید بیشتر از ارزش خالص فعلی شماست — اولویت‌بندی موارد ضروری‌تر توصیه می‌شود."
              : "ارزش خالص فعلی شما پاسخگوی کل لیست خرید است."}
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function YearSwitcher({ year, setYear }: { year: number; setYear: (y: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={() => setYear(year - 1)}>
        <ChevronRight size={16} />
      </Button>
      <span className="text-sm font-semibold">سال {toPersianDigits(year)}</span>
      <Button variant="ghost" size="sm" onClick={() => setYear(year + 1)}>
        <ChevronLeft size={16} />
      </Button>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-neutral-500">{text}</div>;
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "success" | "danger" }) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "danger"
        ? "text-red-600 dark:text-red-400"
        : "text-neutral-800 dark:text-neutral-200";
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className={`mt-1 text-lg font-bold ${toneClass}`}>{formatRial(value)}</p>
    </div>
  );
}
