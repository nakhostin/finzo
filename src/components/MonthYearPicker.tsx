import { useMemo } from "react";
import { SelectField } from "@/components/ui/select";
import { MONTH_NAMES_FA, today, toPersianDigits } from "@/domain/jalali";

interface MonthYearPickerProps {
  year: number;
  month: number;
  onChange: (value: { year: number; month: number }) => void;
  className?: string;
}

/** Two compact selects (month + year) for picking a Jalali month without stepping through it. */
export function MonthYearPicker({ year, month, onChange, className }: MonthYearPickerProps) {
  const monthOptions = useMemo(
    () => MONTH_NAMES_FA.map((name, i) => ({ value: String(i + 1), label: name })),
    [],
  );

  const yearOptions = useMemo(() => {
    const current = today().year;
    // A window wide enough for planning ahead, always including the picked year
    // even if it falls outside (e.g. after restoring an old backup).
    const years = new Set<number>();
    for (let y = current - 3; y <= current + 3; y += 1) years.add(y);
    years.add(year);
    return [...years]
      .sort((a, b) => a - b)
      .map((y) => ({ value: String(y), label: toPersianDigits(y) }));
  }, [year]);

  return (
    <div className={className ? `flex items-center gap-2 ${className}` : "flex items-center gap-2"}>
      <SelectField
        value={String(month)}
        onChange={(value) => onChange({ year, month: Number(value) })}
        options={monthOptions}
        className="w-28 px-2 py-1.5"
      />
      <SelectField
        value={String(year)}
        onChange={(value) => onChange({ year: Number(value), month })}
        options={yearOptions}
        className="w-24 px-2 py-1.5"
      />
    </div>
  );
}
