import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Pencil, Trash2, Plus } from "lucide-react";
import { listRecurringItems, deleteRecurringItem, updateRecurringItem } from "@/db/repositories/recurringItems";
import { listCategories } from "@/db/repositories/categories";
import { listPeople } from "@/db/repositories/people";
import { Button } from "@/components/ui/button";
import { formatRial, formatNumber } from "@/lib/format";
import { RecurringItemForm } from "@/features/recurring-items/RecurringItemForm";
import type { RecurringItem } from "@/types/entities";

const TYPE_LABELS: Record<RecurringItem["type"], string> = {
  debt: "بدهی",
  installment: "قسط",
  income: "درآمد",
  expense: "هزینه",
  receivable: "بستانکاری",
};

export function RecurringItemsList() {
  const items = useLiveQuery(() => listRecurringItems(), [], []);
  const categories = useLiveQuery(() => listCategories(), [], []);
  const people = useLiveQuery(() => listPeople(), [], []);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringItem | undefined>(undefined);

  const categoryName = useMemo(() => {
    const map = new Map((categories ?? []).map((c) => [c.id, c.nameFa]));
    return (id?: string) => (id ? map.get(id) : undefined);
  }, [categories]);

  const personName = useMemo(() => {
    const map = new Map((people ?? []).map((p) => [p.id, p.name]));
    return (id?: string) => (id ? map.get(id) : undefined);
  }, [people]);

  const openCreate = () => {
    setEditingItem(undefined);
    setFormOpen(true);
  };

  const openEdit = (item: RecurringItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleDelete = async (item: RecurringItem) => {
    if (confirm(`آیتم «${item.title}» حذف شود؟ رکوردهای پرداخت‌شده قبلی حفظ می‌شوند.`)) {
      await deleteRecurringItem(item.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus size={16} />
          افزودن آیتم جدید
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200/80 shadow-sm dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400">
            <tr>
              <th className="p-3 text-start">عنوان</th>
              <th className="p-3 text-start">نوع</th>
              <th className="p-3 text-start">دسته / شخص</th>
              <th className="p-3 text-start">اولویت</th>
              <th className="p-3 text-start">روز سررسید</th>
              <th className="p-3 text-start">مبلغ پیش‌فرض</th>
              <th className="p-3 text-start">فعال</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((item) => (
              <tr key={item.id} className="border-t border-neutral-100 transition-colors hover:bg-slate-50/70 dark:border-neutral-800 dark:hover:bg-neutral-800/40">
                <td className="p-3 font-medium">{item.title}</td>
                <td className="p-3 text-neutral-500 dark:text-neutral-400">{TYPE_LABELS[item.type]}</td>
                <td className="p-3 text-neutral-500 dark:text-neutral-400">
                  {[categoryName(item.categoryId), personName(item.personId)].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="p-3">{formatNumber(item.priority)}</td>
                <td className="p-3">{formatNumber(item.dueDay)}</td>
                <td className="p-3">{formatRial(item.defaultAmount)}</td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => updateRecurringItem(item.id, { isActive: !item.isActive })}
                    className={
                      item.isActive
                        ? "rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800"
                    }
                  >
                    {item.isActive ? "فعال" : "غیرفعال"}
                  </button>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)} aria-label="ویرایش">
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item)} aria-label="حذف">
                      <Trash2 size={14} className="text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {items && items.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-neutral-500">
                  هنوز آیتمی ثبت نشده است.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <RecurringItemForm
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editingItem}
        onSaved={() => setFormOpen(false)}
      />
    </div>
  );
}
