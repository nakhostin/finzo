import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select";
import { KeepOpenToggle } from "@/components/ui/keep-open-toggle";
import { JalaliDateField } from "@/components/JalaliDateField";
import { addLot } from "@/db/repositories/assets";
import { today } from "@/domain/jalali";
import { useUiStore } from "@/stores/uiStore";
import type { JalaliDate } from "@/types/entities";

const schema = z.object({
  direction: z.enum(["buy", "sell"]),
  quantity: z.coerce.number().positive("مقدار باید بزرگ‌تر از صفر باشد"),
  unitPrice: z.coerce.number().positive("قیمت واحد باید بزرگ‌تر از صفر باشد"),
  jalaliDate: z.object({
    year: z.coerce.number().int().min(1300).max(1500),
    month: z.coerce.number().int().min(1).max(12),
    day: z.coerce.number().int().min(1).max(31),
  }),
  notes: z.string().optional(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

interface LotFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetTypeId: string;
  unit: string;
  onSaved: () => void;
}

export function LotForm({ open, onOpenChange, assetTypeId, unit, onSaved }: LotFormProps) {
  const keepOpen = useUiStore((s) => s.keepFormOpen);
  const setKeepOpen = useUiStore((s) => s.setKeepFormOpen);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      direction: "buy",
      quantity: 0,
      unitPrice: 0,
      jalaliDate: today(),
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({ direction: "buy", quantity: 0, unitPrice: 0, jalaliDate: today(), notes: "" });
    }
  }, [open, reset]);

  const onSubmit = async (values: FormValues) => {
    await addLot({
      assetTypeId,
      direction: values.direction,
      quantity: values.quantity,
      unitPrice: values.unitPrice,
      jalaliDate: values.jalaliDate,
      notes: values.notes || undefined,
    });

    if (keepOpen) {
      // Keep the transaction type and date so a batch can be entered quickly.
      reset({ direction: values.direction, quantity: 0, unitPrice: 0, jalaliDate: values.jalaliDate, notes: "" });
      setFocus("quantity");
      return;
    }

    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="ثبت تراکنش خرید یا فروش">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>نوع تراکنش</Label>
          <Controller
            control={control}
            name="direction"
            render={({ field }) => (
              <SelectField
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: "buy", label: "خرید" },
                  { value: "sell", label: "فروش" },
                ]}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>مقدار ({unit})</Label>
            <Input type="number" step="any" {...register("quantity")} />
            {errors.quantity && <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>}
          </div>
          <div>
            <Label>قیمت واحد (ریال)</Label>
            <Controller
              control={control}
              name="unitPrice"
              render={({ field }) => <AmountInput value={field.value as number | undefined} onChange={field.onChange} />}
            />
            {errors.unitPrice && <p className="mt-1 text-xs text-red-600">{errors.unitPrice.message}</p>}
          </div>
        </div>

        <div>
          <Label>تاریخ</Label>
          <Controller
            control={control}
            name="jalaliDate"
            render={({ field }) => (
              <JalaliDateField value={field.value as JalaliDate} onChange={field.onChange} />
            )}
          />
        </div>

        <div>
          <Label>توضیحات</Label>
          <Textarea rows={2} {...register("notes")} />
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <KeepOpenToggle checked={keepOpen} onCheckedChange={setKeepOpen} />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              انصراف
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              ثبت تراکنش
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
