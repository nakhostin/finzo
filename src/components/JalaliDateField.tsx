import { MONTH_NAMES_FA } from "@/domain/jalali";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select";
import type { JalaliDate } from "@/types/entities";

const MONTH_OPTIONS = MONTH_NAMES_FA.map((label, idx) => ({ value: String(idx + 1), label }));

interface JalaliDateFieldProps {
  value: JalaliDate;
  onChange: (value: JalaliDate) => void;
}

export function JalaliDateField({ value, onChange }: JalaliDateFieldProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Input
        type="number"
        min={1}
        max={31}
        placeholder="روز"
        value={value.day}
        onChange={(e) => onChange({ ...value, day: Number(e.target.value) })}
      />
      <SelectField
        value={String(value.month)}
        onChange={(v) => onChange({ ...value, month: Number(v) })}
        options={MONTH_OPTIONS}
      />
      <Input
        type="number"
        placeholder="سال"
        value={value.year}
        onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
      />
    </div>
  );
}
