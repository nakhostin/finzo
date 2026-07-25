import { MonthSwitcher } from "@/components/MonthSwitcher";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/uiStore";
import { addMonths, compareYearMonth } from "@/domain/jalali";

const PRESETS = [
  { months: 3, label: "۳ ماه" },
  { months: 6, label: "۶ ماه" },
  { months: 12, label: "۱۲ ماه" },
];

/**
 * Switches the checklist between a single month and a multi-month span.
 * The span always starts at the globally selected month, so the month
 * switcher keeps its meaning in both modes.
 */
export function ChecklistRangeBar() {
  const { selectedYear, selectedMonth, checklistRangeEnd, setChecklistRangeEnd } = useUiStore();
  const isRange = checklistRangeEnd !== null;

  const enableRange = () => setChecklistRangeEnd(addMonths(selectedYear, selectedMonth, 2));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Tabs
        value={isRange ? "range" : "single"}
        onValueChange={(value) => (value === "range" ? enableRange() : setChecklistRangeEnd(null))}
      >
        <TabsList>
          <TabsTrigger value="single">یک ماه</TabsTrigger>
          <TabsTrigger value="range">چند ماه</TabsTrigger>
        </TabsList>
      </Tabs>

      {isRange ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">از</span>
          <MonthYearPicker
            year={selectedYear}
            month={selectedMonth}
            onChange={({ year, month }) => {
              useUiStore.getState().setSelectedYearMonth(year, month);
              // Keep the span valid if the new start passes the current end.
              if (compareYearMonth({ year, month }, checklistRangeEnd) > 0) {
                setChecklistRangeEnd({ year, month });
              }
            }}
          />
          <span className="text-sm text-neutral-500 dark:text-neutral-400">تا</span>
          <MonthYearPicker
            year={checklistRangeEnd.year}
            month={checklistRangeEnd.month}
            onChange={setChecklistRangeEnd}
          />
          <div className="flex items-center gap-1">
            {PRESETS.map((preset) => (
              <Button
                key={preset.months}
                variant="ghost"
                size="sm"
                onClick={() =>
                  setChecklistRangeEnd(addMonths(selectedYear, selectedMonth, preset.months - 1))
                }
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <MonthSwitcher />
      )}
    </div>
  );
}
