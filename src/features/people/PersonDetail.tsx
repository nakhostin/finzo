import { useMemo } from "react";
import { useParams, Link } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight } from "lucide-react";
import { getPerson } from "@/db/repositories/people";
import { listEntriesForPerson } from "@/db/repositories/ledgerEntries";
import { listChequesForPerson } from "@/db/repositories/cheques";
import { StatusBadge, ChequeStatusBadge } from "@/components/StatusBadge";
import { formatRial, formatNumber } from "@/lib/format";
import { monthLabel } from "@/domain/jalali";

export function PersonDetail() {
  const { id } = useParams<{ id: string }>();
  const person = useLiveQuery(() => (id ? getPerson(id) : undefined), [id]);
  const entries = useLiveQuery(() => (id ? listEntriesForPerson(id) : []), [id], []);
  const cheques = useLiveQuery(() => (id ? listChequesForPerson(id) : []), [id], []);

  const balance = useMemo(() => {
    let owedByMe = 0;
    let owedToMe = 0;
    for (const entry of entries ?? []) {
      if (entry.status === "paid" || entry.status === "skipped") continue;
      const amount = entry.amountActual ?? entry.amountPlanned;
      if (entry.type === "receivable") owedToMe += amount;
      else if (entry.type === "debt" || entry.type === "installment") owedByMe += amount;
    }
    return { owedByMe, owedToMe };
  }, [entries]);

  const sortedEntries = useMemo(
    () =>
      [...(entries ?? [])].sort((a, b) => {
        const ka = a.jalaliYear * 372 + a.jalaliMonth * 31 + a.dueDay;
        const kb = b.jalaliYear * 372 + b.jalaliMonth * 31 + b.dueDay;
        return kb - ka;
      }),
    [entries],
  );

  if (!person) {
    return <p className="text-neutral-500">شخص یافت نشد.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/people"
          className="mb-2 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-blue-700 dark:hover:text-blue-400"
        >
          <ChevronRight size={14} />
          بازگشت به اشخاص
        </Link>
        <h2 className="text-2xl font-bold">{person.name}</h2>
        {person.notes && <p className="text-neutral-500 dark:text-neutral-400">{person.notes}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">بدهی من به {person.name}</p>
          <p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">
            {formatRial(balance.owedByMe)}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">طلب من از {person.name}</p>
          <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatRial(balance.owedToMe)}
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold">تراکنش‌ها</h3>
        <div className="overflow-hidden rounded-2xl border border-neutral-200/80 shadow-sm dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400">
              <tr>
                <th className="p-3 text-start">عنوان</th>
                <th className="p-3 text-start">تاریخ</th>
                <th className="p-3 text-start">مبلغ</th>
                <th className="p-3 text-start">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry) => (
                <tr key={entry.id} className="border-t border-neutral-100 transition-colors hover:bg-slate-50/70 dark:border-neutral-800 dark:hover:bg-neutral-800/40">
                  <td className="p-3 font-medium">{entry.title}</td>
                  <td className="p-3 text-neutral-500 dark:text-neutral-400">
                    {monthLabel(entry.jalaliMonth)} {formatNumber(entry.jalaliYear)}
                  </td>
                  <td className="p-3">{formatRial(entry.amountActual ?? entry.amountPlanned)}</td>
                  <td className="p-3">
                    <StatusBadge status={entry.status} />
                  </td>
                </tr>
              ))}
              {sortedEntries.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-neutral-500">
                    تراکنشی ثبت نشده است.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {cheques && cheques.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold">چک‌ها</h3>
          <div className="overflow-hidden rounded-2xl border border-neutral-200/80 shadow-sm dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400">
                <tr>
                  <th className="p-3 text-start">شماره چک</th>
                  <th className="p-3 text-start">سررسید</th>
                  <th className="p-3 text-start">مبلغ</th>
                  <th className="p-3 text-start">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {cheques.map((cheque) => (
                  <tr key={cheque.id} className="border-t border-neutral-100 transition-colors hover:bg-slate-50/70 dark:border-neutral-800 dark:hover:bg-neutral-800/40">
                    <td className="p-3 font-medium">{cheque.chequeNumber}</td>
                    <td className="p-3 text-neutral-500 dark:text-neutral-400">
                      {monthLabel(cheque.dueJalaliDate.month)} {formatNumber(cheque.dueJalaliDate.day)}،{" "}
                      {formatNumber(cheque.dueJalaliDate.year)}
                    </td>
                    <td className="p-3">{formatRial(cheque.amount)}</td>
                    <td className="p-3">
                      <ChequeStatusBadge status={cheque.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
