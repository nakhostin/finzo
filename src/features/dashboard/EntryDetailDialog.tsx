import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select";
import { listCategories } from "@/db/repositories/categories";
import { listAccounts } from "@/db/repositories/accounts";
import { listPeople } from "@/db/repositories/people";
import { updateLedgerEntry } from "@/db/repositories/ledgerEntries";
import { getRecurringItem } from "@/db/repositories/recurringItems";
import { today } from "@/domain/jalali";
import type { LedgerEntry, ItemType, EntryStatus } from "@/types/entities";

const TYPE_OPTIONS: Array<{ value: ItemType; label: string }> = [
  { value: "debt", label: "بدهی" },
  { value: "installment", label: "قسط" },
  { value: "receivable", label: "بستانکاری (طلب از دیگران)" },
  { value: "income", label: "درآمد" },
  { value: "expense", label: "هزینه" },
];

const STATUS_OPTIONS: Array<{ value: EntryStatus; label: string }> = [
  { value: "pending", label: "در انتظار" },
  { value: "paid", label: "پرداخت‌شده" },
  { value: "partial", label: "پرداخت جزئی" },
  { value: "skipped", label: "رد شده" },
];

const schema = z.object({
  title: z.string().min(1, "عنوان الزامی است"),
  type: z.enum(["debt", "installment", "income", "expense", "receivable"]),
  categoryId: z.string(),
  personId: z.string(),
  accountId: z.string(),
  dueDay: z.coerce.number().int().min(1).max(31),
  amountPlanned: z.coerce.number().min(0),
  amountActual: z.coerce.number().min(0).optional(),
  status: z.enum(["pending", "paid", "partial", "skipped"]),
  reminderDaysBefore: z.coerce.number().int().min(0).max(60),
  notes: z.string().optional(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function entryToFormValues(entry: LedgerEntry): FormInput {
  return {
    title: entry.title,
    type: entry.type,
    categoryId: entry.categoryId ?? "",
    personId: entry.personId ?? "",
    accountId: entry.accountId ?? "",
    dueDay: entry.dueDay,
    amountPlanned: entry.amountPlanned,
    amountActual: entry.amountActual,
    status: entry.status === "overdue" ? "pending" : entry.status,
    reminderDaysBefore: entry.reminderDaysBefore ?? 3,
    notes: entry.notes ?? "",
  };
}

interface EntryDetailDialogProps {
  entry: LedgerEntry;
  onOpenChange: (open: boolean) => void;
}

export function EntryDetailDialog({ entry, onOpenChange }: EntryDetailDialogProps) {
  const categories = useLiveQuery(() => listCategories(), []) ?? [];
  const accounts = useLiveQuery(() => listAccounts(), []) ?? [];
  const people = useLiveQuery(() => listPeople(), [], []) ?? [];
  const recurringItem = useLiveQuery(
    () => (entry.recurringItemId ? getRecurringItem(entry.recurringItemId) : undefined),
    [entry.recurringItemId],
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: entryToFormValues(entry),
  });

  useEffect(() => {
    reset(entryToFormValues(entry));
  }, [entry, reset]);

  const status = watch("status");

  const onSubmit = async (values: FormValues) => {
    await updateLedgerEntry(entry.id, {
      title: values.title,
      type: values.type,
      categoryId: values.categoryId || undefined,
      personId: values.personId || undefined,
      accountId: values.accountId || undefined,
      dueDay: values.dueDay,
      amountPlanned: values.amountPlanned,
      amountActual: values.amountActual,
      status: values.status,
      paidJalaliDate: values.status === "paid" || values.status === "partial" ? (entry.paidJalaliDate ?? today()) : undefined,
      reminderDaysBefore: values.reminderDaysBefore,
      notes: values.notes || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open onOpenChange={onOpenChange} title="جزئیات سررسید">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {recurringItem && (
          <p className="rounded-lg bg-blue-50 p-2.5 text-xs text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            این مورد از آیتم تکرارشونده «{recurringItem.title}» ساخته شده است. تغییرات اینجا فقط همین ماه را
            تحت تأثیر قرار می‌دهد؛ برای تغییر همه ماه‌ها به{" "}
            <Link to="/recurring" className="font-semibold underline">
              مدیریت آیتم‌ها
            </Link>{" "}
            بروید.
          </p>
        )}

        <div>
          <Label>عنوان</Label>
          <Input {...register("title")} />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>نوع</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <SelectField value={field.value} onChange={field.onChange} options={TYPE_OPTIONS} />
              )}
            />
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
                  options={categories.map((c) => ({ value: c.id, label: c.nameFa }))}
                />
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>حساب</Label>
            <Controller
              control={control}
              name="accountId"
              render={({ field }) => (
                <SelectField
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="بدون حساب"
                  options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                />
              )}
            />
          </div>
          <div>
            <Label>شخص طرف حساب</Label>
            <Controller
              control={control}
              name="personId"
              render={({ field }) => (
                <SelectField
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="بدون شخص"
                  options={people.map((p) => ({ value: p.id, label: p.name }))}
                />
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>روز سررسید</Label>
            <Input type="number" min={1} max={31} {...register("dueDay")} />
          </div>
          <div>
            <Label>مبلغ برنامه‌ریزی‌شده</Label>
            <Controller
              control={control}
              name="amountPlanned"
              render={({ field }) => <AmountInput value={field.value as number | undefined} onChange={field.onChange} />}
            />
          </div>
          <div>
            <Label>مبلغ واقعی</Label>
            <Controller
              control={control}
              name="amountActual"
              render={({ field }) => <AmountInput value={field.value as number | undefined} onChange={field.onChange} />}
            />
          </div>
        </div>

        <div>
          <Label>وضعیت</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <SelectField value={field.value} onChange={field.onChange} options={STATUS_OPTIONS} />
            )}
          />
          {(status === "paid" || status === "partial") && (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              تاریخ پرداخت به‌صورت خودکار روی امروز ثبت می‌شود (در صورت نبود تاریخ قبلی).
            </p>
          )}
        </div>

        <div>
          <Label>یادآوری قبل از سررسید (روز)</Label>
          <Input type="number" min={0} max={60} className="max-w-32" {...register("reminderDaysBefore")} />
        </div>

        <div>
          <Label>توضیحات</Label>
          <Textarea rows={2} {...register("notes")} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            ذخیره تغییرات
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
