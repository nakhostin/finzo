import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  "aria-label"?: string;
}

export function Checkbox({ checked, onCheckedChange, className, ...rest }: CheckboxProps) {
  return (
    <RadixCheckbox.Root
      checked={checked}
      onCheckedChange={(value) => onCheckedChange(value === true)}
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-md border border-neutral-300 bg-white data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 dark:border-neutral-600 dark:bg-neutral-900",
        className,
      )}
      {...rest}
    >
      <RadixCheckbox.Indicator className="text-white">
        <Check size={14} />
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );
}
