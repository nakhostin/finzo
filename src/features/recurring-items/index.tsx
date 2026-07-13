import { RecurringItemsList } from "@/features/recurring-items/RecurringItemsList";

export function RecurringItemsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">مدیریت آیتم‌های تکرارشونده</h2>
      <RecurringItemsList />
    </div>
  );
}
