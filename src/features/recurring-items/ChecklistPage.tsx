import { ChecklistRangeBar } from "@/features/recurring-items/ChecklistRangeBar";
import { MonthlyChecklist } from "@/features/recurring-items/MonthlyChecklist";

export function ChecklistPage() {
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">چک‌لیست</h2>
      <ChecklistRangeBar />
      <MonthlyChecklist />
    </div>
  );
}
