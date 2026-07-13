import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { listCheques, deleteCheque, transitionChequeStatus } from "@/db/repositories/cheques";
import { listAccounts } from "@/db/repositories/accounts";
import { listPeople } from "@/db/repositories/people";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select";
import { ChequeStatusBadge } from "@/components/StatusBadge";
import { formatRial, formatNumber } from "@/lib/format";
import { monthLabel } from "@/domain/jalali";
import { ChequeForm } from "@/features/cheques/ChequeForm";
import type { Cheque, ChequeStatus } from "@/types/entities";

const STATUS_OPTIONS: Array<{ value: ChequeStatus; label: string }> = [
  { value: "in-hand", label: "در اختیار" },
  { value: "deposited", label: "واگذارشده به بانک" },
  { value: "cleared", label: "پاس‌شده" },
  { value: "bounced", label: "برگشت‌خورده" },
  { value: "cancelled", label: "باطل‌شده" },
];

const DIRECTION_LABELS: Record<Cheque["direction"], string> = {
  issued: "صادره",
  received: "دریافتی",
};

export function ChequesPage() {
  const cheques = useLiveQuery(() => listCheques(), [], []);
  const accounts = useLiveQuery(() => listAccounts(), [], []);
  const people = useLiveQuery(() => listPeople(), [], []);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCheque, setEditingCheque] = useState<Cheque | undefined>(undefined);

  const accountName = useMemo(() => {
    const map = new Map((accounts ?? []).map((a) => [a.id, a.name]));
    return (id: string) => map.get(id) ?? "—";
  }, [accounts]);

  const personName = useMemo(() => {
    const map = new Map((people ?? []).map((p) => [p.id, p.name]));
    return (id?: string) => (id ? (map.get(id) ?? "—") : "—");
  }, [people]);

  const sorted = useMemo(
    () =>
      [...(cheques ?? [])].sort((a, b) => {
        const ya = a.dueJalaliDate.year * 372 + a.dueJalaliDate.month * 31 + a.dueJalaliDate.day;
        const yb = b.dueJalaliDate.year * 372 + b.dueJalaliDate.month * 31 + b.dueJalaliDate.day;
        return ya - yb;
      }),
    [cheques],
  );

  const openCreate = () => {
    setEditingCheque(undefined);
    setFormOpen(true);
  };

  const openEdit = (cheque: Cheque) => {
    setEditingCheque(cheque);
    setFormOpen(true);
  };

  const handleDelete = async (cheque: Cheque) => {
    if (confirm(`چک شماره «${cheque.chequeNumber}» حذف شود؟`)) {
      await deleteCheque(cheque.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">چک‌ها</h2>
        <Button onClick={openCreate}>
          <Plus size={16} />
          افزودن چک جدید
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200/80 shadow-sm dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400">
            <tr>
              <th className="p-3 text-start">شماره چک</th>
              <th className="p-3 text-start">نوع</th>
              <th className="p-3 text-start">حساب</th>
              <th className="p-3 text-start">طرف حساب</th>
              <th className="p-3 text-start">تاریخ سررسید</th>
              <th className="p-3 text-start">مبلغ</th>
              <th className="p-3 text-start">وضعیت</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((cheque) => (
              <tr key={cheque.id} className="border-t border-neutral-100 transition-colors hover:bg-slate-50/70 dark:border-neutral-800 dark:hover:bg-neutral-800/40">
                <td className="p-3 font-medium">{cheque.chequeNumber}</td>
                <td className="p-3 text-neutral-500 dark:text-neutral-400">
                  {DIRECTION_LABELS[cheque.direction]}
                </td>
                <td className="p-3 text-neutral-500 dark:text-neutral-400">{accountName(cheque.accountId)}</td>
                <td className="p-3 text-neutral-500 dark:text-neutral-400">
                  {personName(cheque.counterpartyPersonId)}
                </td>
                <td className="p-3">
                  {monthLabel(cheque.dueJalaliDate.month)} {formatNumber(cheque.dueJalaliDate.day)}،{" "}
                  {formatNumber(cheque.dueJalaliDate.year)}
                </td>
                <td className="p-3">{formatRial(cheque.amount)}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <ChequeStatusBadge status={cheque.status} />
                    <div className="w-36">
                      <SelectField
                        value={cheque.status}
                        onChange={(v) => transitionChequeStatus(cheque.id, v as ChequeStatus)}
                        options={STATUS_OPTIONS}
                      />
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(cheque)} aria-label="ویرایش">
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(cheque)} aria-label="حذف">
                      <Trash2 size={14} className="text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {cheques && cheques.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-neutral-500">
                  هنوز چکی ثبت نشده است.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ChequeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        cheque={editingCheque}
        onSaved={() => setFormOpen(false)}
      />
    </div>
  );
}
