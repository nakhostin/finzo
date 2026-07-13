import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLiveQuery } from "dexie-react-hooks";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select";
import { KeepOpenToggle } from "@/components/ui/keep-open-toggle";
import { listCategories } from "@/db/repositories/categories";
import { addShoppingItem, updateShoppingItem } from "@/db/repositories/shopping";
import { today, MONTH_NAMES_FA } from "@/domain/jalali";
import { useUiStore } from "@/stores/uiStore";
import type { ShoppingItem, ShoppingStatus } from "@/types/entities";

const STATUS_OPTIONS: Array<{ value: ShoppingStatus; label: string }> = [
  { value: "wishlist", label: "لیست آرزو" },
  { value: "planned", label: "برنامه‌ریزی‌شده" },
  { value: "purchased", label: "خریداری‌شده" },
  { value: "cancelled", label: "منصرف‌شده" },
];

const schema = z.object({
  title: z.string().min(1, "عنوان الزامی است"),
  quantity: z.coerce.number().int().positive(),
  estimatedPrice: z.coerce.number().min(0).optional(),
  actualPrice: z.coerce.number().min(0).optional(),
  status: z.enum(["wishlist", "planned", "purchased", "cancelled"]),
  priority: z.coerce.number().int().min(1).max(99),
  categoryId: z.string(),
  targetYear: z.coerce.number().int().min(1300).max(1500),
  targetMonth: z.coerce.number().int().min(1).max(12),
  notes: z.string().optional(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function itemToFormValues(item: ShoppingItem | undefined, fallbackMonth: { year: number; month: number }): FormInput {
  if (!item) {
    return {
      title: "",
      quantity: 1,
      estimatedPrice: undefined,
      actualPrice: undefined,
      status: "wishlist",
      priority: 1,
      categoryId: "",
      targetYear: fallbackMonth.year,
      targetMonth: fallbackMonth.month,
      notes: "",
    };
  }
  return {
    title: item.title,
    quantity: item.quantity,
    estimatedPrice: item.estimatedPrice,
    actualPrice: item.actualPrice,
    status: item.status,
    priority: item.priority,
    categoryId: item.categoryId ?? "",
    targetYear: item.targetJalaliYear ?? fallbackMonth.year,
    targetMonth: item.targetJalaliMonth ?? fallbackMonth.month,
    notes: item.notes ?? "",
  };
}

interface ShoppingItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ShoppingItem;
  onSaved: () => void;
}

export function ShoppingItemForm({ open, onOpenChange, item, onSaved }: ShoppingItemFormProps) {
  const categories = useLiveQuery(() => listCategories(), [], []);
  const selectedYear = useUiStore((s) => s.selectedYear);
  const selectedMonth = useUiStore((s) => s.selectedMonth);
  const keepOpen = useUiStore((s) => s.keepFormOpen);
  const setKeepOpen = useUiStore((s) => s.setKeepFormOpen);
  const fallbackMonth = { year: selectedYear, month: selectedMonth };

  const {
    register,
    handleSubmit,
    control,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: itemToFormValues(item, fallbackMonth),
  });

  useEffect(() => {
    if (open) reset(itemToFormValues(item, { year: selectedYear, month: selectedMonth }));
  }, [open, item, reset, selectedYear, selectedMonth]);

  const onSubmit = async (values: FormValues) => {
    const wasPurchased = item?.status === "purchased";
    const nowPurchased = values.status === "purchased";
    const payload: Omit<ShoppingItem, "id"> = {
      title: values.title,
      quantity: values.quantity,
      estimatedPrice: values.estimatedPrice,
      actualPrice: values.actualPrice,
      status: values.status,
      priority: values.priority,
      categoryId: values.categoryId || undefined,
      targetJalaliYear: values.targetYear,
      targetJalaliMonth: values.targetMonth,
      addedJalaliDate: item?.addedJalaliDate ?? today(),
      purchasedJalaliDate: !wasPurchased && nowPurchased ? today() : item?.purchasedJalaliDate,
      notes: values.notes || undefined,
    };

    if (item) {
      await updateShoppingItem(item.id, payload);
    } else {
      await addShoppingItem(payload);
    }

    // In create mode with "keep open" on, stay in the dialog and reset for the
    // next entry — keeping the month/status/category/priority so a batch of
    // items for the same month can be added quickly.
    if (!item && keepOpen) {
      reset({
        title: "",
        quantity: 1,
        estimatedPrice: undefined,
        actualPrice: undefined,
        status: values.status,
        priority: values.priority,
        categoryId: values.categoryId,
        targetYear: values.targetYear,
        targetMonth: values.targetMonth,
        notes: "",
      });
      setFocus("title");
      return;
    }

    onSaved();
    onOpenChange(false);
  };

  const monthOptions = MONTH_NAMES_FA.map((label, idx) => ({ value: String(idx + 1), label }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={item ? "ویرایش کالا" : "افزودن به لیست خرید"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>عنوان</Label>
          <Input {...register("title")} placeholder="مثلا: یخچال جدید" />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>تعداد</Label>
            <Input type="number" min={1} {...register("quantity")} />
          </div>
          <div>
            <Label>قیمت تخمینی (ریال)</Label>
            <Controller
              control={control}
              name="estimatedPrice"
              render={({ field }) => <AmountInput value={field.value as number | undefined} onChange={field.onChange} />}
            />
          </div>
          <div>
            <Label>قیمت واقعی (ریال)</Label>
            <Controller
              control={control}
              name="actualPrice"
              render={({ field }) => <AmountInput value={field.value as number | undefined} onChange={field.onChange} />}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>وضعیت</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <SelectField value={field.value} onChange={field.onChange} options={STATUS_OPTIONS} />
              )}
            />
          </div>
          <div>
            <Label>اولویت</Label>
            <Input type="number" min={1} max={99} {...register("priority")} />
          </div>
          <div>
            <Label>دسته‌بندی</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <SelectField
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="بدون دسته‌بندی"
                  options={(categories ?? []).map((c) => ({ value: c.id, label: c.nameFa }))}
                />
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>ماه هدف خرید</Label>
            <Controller
              control={control}
              name="targetMonth"
              render={({ field }) => (
                <SelectField
                  value={String(field.value)}
                  onChange={(v) => field.onChange(Number(v))}
                  options={monthOptions}
                />
              )}
            />
          </div>
          <div>
            <Label>سال هدف خرید</Label>
            <Input type="number" {...register("targetYear")} />
          </div>
        </div>

        <div>
          <Label>توضیحات</Label>
          <Textarea rows={2} {...register("notes")} />
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          {item ? <span /> : <KeepOpenToggle checked={keepOpen} onCheckedChange={setKeepOpen} />}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              انصراف
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {item ? "ذخیره تغییرات" : "افزودن"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
