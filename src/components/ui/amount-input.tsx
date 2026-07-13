import * as React from "react";
import { Input } from "@/components/ui/input";
import { toEnglishDigits } from "@/domain/jalali";

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export interface AmountInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "dir"> {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

/**
 * Money input that groups digits with thousands separators as the user types
 * (e.g. "75,000,000"), so large Rial amounts stay readable. Reports a plain
 * number (or undefined when empty) to the caller — the grouped text is purely
 * a display concern. Forced `dir="ltr"` keeps digits/commas from being
 * bidi-reordered inside the surrounding RTL form.
 */
export const AmountInput = React.forwardRef<HTMLInputElement, AmountInputProps>(
  ({ value, onChange, ...rest }, ref) => {
    const [text, setText] = React.useState(() => (value === undefined ? "" : groupThousands(String(value))));

    React.useEffect(() => {
      setText(value === undefined ? "" : groupThousands(String(value)));
    }, [value]);

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        dir="ltr"
        value={text}
        onChange={(e) => {
          const digitsOnly = toEnglishDigits(e.target.value).replace(/[^0-9]/g, "");
          if (digitsOnly === "") {
            setText("");
            onChange(undefined);
            return;
          }
          const normalized = digitsOnly.replace(/^0+(?=\d)/, "");
          setText(groupThousands(normalized));
          onChange(Number(normalized));
        }}
        {...rest}
      />
    );
  },
);
AmountInput.displayName = "AmountInput";
