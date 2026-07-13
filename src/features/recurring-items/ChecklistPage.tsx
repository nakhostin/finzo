import { MonthSwitcher } from "@/components/MonthSwitcher";
import { MonthlyChecklist } from "@/features/recurring-items/MonthlyChecklist";

export function ChecklistPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">چک‌لیست ماه</h2>
        <MonthSwitcher />
      </div>
      <MonthlyChecklist />
    </div>
  );
}
