import { Checkbox } from "@/components/ui/checkbox";

interface KeepOpenToggleProps {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}

/**
 * Footer toggle for add-forms: when checked, the dialog stays open after saving
 * so the user can enter several items in a row without reopening it.
 */
export function KeepOpenToggle({ checked, onCheckedChange }: KeepOpenToggleProps) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} aria-label="پس از افزودن، فرم باز بماند" />
      فرم باز بماند تا مورد بعدی را وارد کنم
    </label>
  );
}
