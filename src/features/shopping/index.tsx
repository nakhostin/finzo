import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { listShoppingItems, deleteShoppingItem } from "@/db/repositories/shopping";
import { listCategories } from "@/db/repositories/categories";
import { Button } from "@/components/ui/button";
import { formatRial, formatNumber } from "@/lib/format";
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

export function ShoppingPage() {
  const items = useLiveQuery(() => listShoppingItems(), [], []);
  const categories = useLiveQuery(() => listCategories(), [], []);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | undefined>(undefined);

  const categoryName = useMemo(() => {
    const map = new Map((categories ?? []).map((c) => [c.id, c.nameFa]));
    return (id?: string) => (id ? map.get(id) : undefined);
  }, [categories]);

  const sorted = useMemo(
    () => [...(items ?? [])].sort((a, b) => a.priority - b.priority),
    [items],
  );

  const pendingTotal = useMemo(
    () =>
      (items ?? [])
        .filter((i) => i.status === "wishlist" || i.status === "planned")
        .reduce((sum, i) => sum + (i.estimatedPrice ?? 0) * i.quantity, 0),
    [items],
  );

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">لیست خرید</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            مجموع تخمینی موارد باقی‌مانده: {formatRial(pendingTotal)}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          افزودن به لیست
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200/80 shadow-sm dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400">
            <tr>
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
            {sorted.map((item) => (
              <tr key={item.id} className="border-t border-neutral-100 transition-colors hover:bg-slate-50/70 dark:border-neutral-800 dark:hover:bg-neutral-800/40">
                <td className="p-3 font-medium">{item.title}</td>
                <td className="p-3 text-neutral-500 dark:text-neutral-400">
                  {categoryName(item.categoryId) ?? "—"}
                </td>
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
                  لیست خرید خالی است.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ShoppingItemForm
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editingItem}
        onSaved={() => setFormOpen(false)}
      />
    </div>
  );
}
