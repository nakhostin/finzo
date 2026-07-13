import * as React from "react";
import { cn } from "@/lib/utils";
import { toEnglishDigits } from "@/domain/jalali";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, onChange, ...props }, ref) => {
    // Native <input type="number"> silently rejects Persian/Arabic-Indic digit
    // keystrokes (common on Iranian keyboard layouts), so numeric fields are
    // rendered as text + a numeric virtual keyboard and normalized by hand.
    const isNumeric = type === "number";

    const handleChange = isNumeric
      ? (e: React.ChangeEvent<HTMLInputElement>) => {
          const normalized = toEnglishDigits(e.target.value).replace(/[^0-9.-]/g, "");
          if (normalized !== e.target.value) e.target.value = normalized;
          onChange?.(e);
        }
      : onChange;

    return (
      <input
        ref={ref}
        type={isNumeric ? "text" : type}
        inputMode={isNumeric ? "decimal" : undefined}
        onChange={handleChange}
        className={cn(
          "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100",
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";
