import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Pencil, Trash2, Ban, RotateCcw } from "lucide-react";
import { listShoppingItems, deleteShoppingItem, updateShoppingItem } from "@/db/repositories/shopping";
import { listCategories } from "@/db/repositories/categories";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { formatRial, formatNumber } from "@/lib/format";
import { monthLabel, toPersianDigits, today } from "@/domain/jalali";
import { useUiStore } from "@/stores/uiStore";
import { ShoppingItemForm } from "@/features/shopping/ShoppingItemForm";
import type { ShoppingItem, ShoppingStatus } from "@/types/entities";

const STATUS_LABELS: Record<ShoppingStatus, string> = {
  wishlist: "لیست آرزو",
  planned: "برنامه‌ریزی‌شده",
  purchased: "خریداری‌شده",
  cancelled: "منصرف‌شده",
};

const STATUS_CLASSES: Record<ShoppingStatus, string> = {
  wishlist: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  planned: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  purchased: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  cancelled: "bg-neutral-100 text-neutral-400 line-through dark:bg-neutral-800",
};

const isPending = (i: ShoppingItem) => i.status === "wishlist" || i.status === "planned";
const pendingSum = (items: ShoppingItem[]) =>
  items.filter(isPending).reduce((sum, i) => sum + (i.estimatedPrice ?? 0) * i.quantity, 0);

export function ShoppingPage() {
  const items = useLiveQuery(() => listShoppingItems(), [], []);
  const categories = useLiveQuery(() => listCategories(), [], []);
  const selectedYear = useUiStore((s) => s.selectedYear);
  const selectedMonth = useUiStore((s) => s.selectedMonth);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | undefined>(undefined);

  const categoryName = useMemo(() => {
    const map = new Map((categories ?? []).map((c) => [c.id, c.nameFa]));
    return (id?: string) => (id ? map.get(id) : undefined);
  }, [categories]);

  const monthItems = useMemo(
    () =>
      [...(items ?? [])]
        .filter((i) => i.targetJalaliYear === selectedYear && i.targetJalaliMonth === selectedMonth)
        .sort((a, b) => a.priority - b.priority),
    [items, selectedYear, selectedMonth],
  );

  const noMonthItems = useMemo(
    () =>
      [...(items ?? [])]
        .filter((i) => i.targetJalaliYear == null || i.targetJalaliMonth == null)
        .sort((a, b) => a.priority - b.priority),
    [items],
  );

  const monthPendingTotal = useMemo(() => pendingSum(monthItems), [monthItems]);

  const openCreate = () => {
    setEditingItem(undefined);
    setFormOpen(true);
  };

  const openEdit = (item: ShoppingItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleDelete = async (item: ShoppingItem) => {
    if (confirm(`«${item.title}» از لیست خرید حذف شود؟`)) {
      await deleteShoppingItem(item.id);
    }
  };

  const setStatus = async (item: ShoppingItem, status: ShoppingStatus) => {
    const changes: Partial<ShoppingItem> = { status };
    if (status === "purchased" && item.status !== "purchased") {
      changes.purchasedJalaliDate = item.purchasedJalaliDate ?? today();
    }
    await updateShoppingItem(item.id, changes);
  };

  // Checklist toggle: tick = خریداری‌شده، برداشتن تیک = برنامه‌ریزی‌شده (هنوز نخریده)
  const togglePurchased = (item: ShoppingItem, checked: boolean) =>
    setStatus(item, checked ? "purchased" : "planned");

  const toggleCancelled = (item: ShoppingItem) =>
    setStatus(item, item.status === "cancelled" ? "planned" : "cancelled");

  const renderTable = (list: ShoppingItem[]) => (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400">
        <tr>
          <th className="w-12 p-3 text-center">خرید</th>
          <th className="p-3 text-start">عنوان</th>
          <th className="p-3 text-start">دسته‌بندی</th>
          <th className="p-3 text-start">تعداد</th>
          <th className="p-3 text-start">قیمت تخمینی</th>
          <th className="p-3 text-start">قیمت واقعی</th>
          <th className="p-3 text-start">اولویت</th>
          <th className="p-3 text-start">وضعیت</th>
          <th className="p-3"></th>
        </tr>
      </thead>
      <tbody>
        {list.map((item) => {
          const cancelled = item.status === "cancelled";
          const purchased = item.status === "purchased";
          return (
            <tr
              key={item.id}
              className={`border-t border-neutral-100 transition-colors hover:bg-slate-50/70 dark:border-neutral-800 dark:hover:bg-neutral-800/40 ${
                cancelled ? "opacity-60" : ""
              }`}
            >
              <td className="p-3 text-center">
                <div className="flex justify-center">
                  <Checkbox
                    checked={purchased}
                    onCheckedChange={(checked) => togglePurchased(item, checked)}
                    aria-label="خریداری‌شده"
                  />
                </div>
              </td>
              <td className={`p-3 font-medium ${cancelled ? "line-through" : ""}`}>{item.title}</td>
              <td className="p-3 text-neutral-500 dark:text-neutral-400">{categoryName(item.categoryId) ?? "—"}</td>
              <td className="p-3">{formatNumber(item.quantity)}</td>
              <td className="p-3">{item.estimatedPrice ? formatRial(item.estimatedPrice) : "—"}</td>
              <td className="p-3">{item.actualPrice ? formatRial(item.actualPrice) : "—"}</td>
              <td className="p-3">{formatNumber(item.priority)}</td>
              <td className="p-3">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[item.status]}`}
                >
                  {STATUS_LABELS[item.status]}
                </span>
              </td>
              <td className="p-3">
                <div className="flex justify-end gap-1">
                  {cancelled ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCancelled(item)}
                      aria-label="بازگردانی به لیست"
                      title="بازگردانی به لیست"
                    >
                      <RotateCcw size={14} />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCancelled(item)}
                      aria-label="منصرف شدم"
                      title="منصرف شدم"
                    >
                      <Ban size={14} className="text-amber-600" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => openEdit(item)} aria-label="ویرایش">
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item)} aria-label="حذف">
                    <Trash2 size={14} className="text-red-600" />
                  </Button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">لیست خرید</h2>
        <MonthSwitcher />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          مجموع تخمینی موارد باقی‌ماندهٔ {monthLabel(selectedMonth)} {toPersianDigits(selectedYear)}:{" "}
          {formatRial(monthPendingTotal)}
        </p>
        <Button onClick={openCreate}>
          <Plus size={16} />
          افزودن به لیست
        </Button>
      </div>

      {monthItems.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-neutral-200/80 shadow-sm dark:border-neutral-800">
          {renderTable(monthItems)}
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-200/80 p-6 text-center text-neutral-500 shadow-sm dark:border-neutral-800">
          {items && items.length === 0
            ? "لیست خرید خالی است."
            : `برای ${monthLabel(selectedMonth)} ${toPersianDigits(selectedYear)} موردی ثبت نشده است.`}
        </div>
      )}

      {noMonthItems.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-neutral-200/80 shadow-sm dark:border-neutral-800">
          <header className="flex items-center justify-between gap-3 border-b border-neutral-100 bg-slate-50 px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-900/60">
            <h3 className="text-sm font-bold">بدون ماه مشخص</h3>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              باقی‌مانده: {formatRial(pendingSum(noMonthItems))}
            </span>
          </header>
          {renderTable(noMonthItems)}
        </section>
      )}

      <ShoppingItemForm
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editingItem}
        onSaved={() => setFormOpen(false)}
      />
    </div>
  );
}
