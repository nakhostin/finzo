import { ChevronRight, ChevronLeft } from "lucide-react";
import { useUiStore } from "@/stores/uiStore";
import { addMonths, monthLabel, toPersianDigits } from "@/domain/jalali";
import { Button } from "@/components/ui/button";

export function MonthSwitcher() {
  const { selectedYear, selectedMonth, setSelectedYearMonth } = useUiStore();

  const goPrev = () => {
    const { year, month } = addMonths(selectedYear, selectedMonth, -1);
    setSelectedYearMonth(year, month);
  };
  const goNext = () => {
    const { year, month } = addMonths(selectedYear, selectedMonth, 1);
    setSelectedYearMonth(year, month);
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={goPrev} aria-label="ماه قبل">
        <ChevronRight size={16} />
      </Button>
      <span className="min-w-32 text-center text-sm font-semibold">
        {monthLabel(selectedMonth)} {toPersianDigits(selectedYear)}
      </span>
      <Button variant="ghost" size="sm" onClick={goNext} aria-label="ماه بعد">
        <ChevronLeft size={16} />
      </Button>
    </div>
  );
}
