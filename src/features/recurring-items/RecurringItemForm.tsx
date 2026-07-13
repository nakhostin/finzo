import { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { KeepOpenToggle } from "@/components/ui/keep-open-toggle";
import { listCategories } from "@/db/repositories/categories";
import { listAccounts } from "@/db/repositories/accounts";
import { listPeople, addPerson } from "@/db/repositories/people";
import { addRecurringItem, updateRecurringItem } from "@/db/repositories/recurringItems";
import { ensureYearsGenerated } from "@/domain/recurrence";
import { today, MONTH_NAMES_FA } from "@/domain/jalali";
import { useUiStore } from "@/stores/uiStore";
import type { RecurringItem, ItemType, JalaliDate } from "@/types/entities";

const ITEM_TYPE_OPTIONS: Array<{ value: ItemType; label: string }> = [
  { value: "debt", label: "بدهی" },
  { value: "installment", label: "قسط" },
  { value: "receivable", label: "بستانکاری (طلب از دیگران)" },
  { value: "income", label: "درآمد" },
  { value: "expense", label: "هزینه" },
];

const schema = z
  .object({
    title: z.string().min(1, "عنوان الزامی است"),
    type: z.enum(["debt", "installment", "income", "expense", "receivable"]),
    categoryId: z.string(),
    personId: z.string(),
    accountId: z.string(),
    priority: z.coerce.number().int().min(1).max(99),
    dueDay: z.coerce.number().int().min(1).max(31),
    defaultAmount: z.coerce.number().min(0),
    frequency: z.enum(["monthly", "once"]),
    startYear: z.coerce.number().int().min(1300).max(1500),
    startMonth: z.coerce.number().int().min(1).max(12),
    hasEnd: z.boolean(),
    endYear: z.coerce.number().int().min(1300).max(1500).optional(),
    endMonth: z.coerce.number().int().min(1).max(12).optional(),
    hasSchedule: z.boolean(),
    scheduleText: z.string().optional(),
    reminderDaysBefore: z.coerce.number().int().min(0).max(60),
    notes: z.string().optional(),
  })
  .refine((v) => !v.hasSchedule || (v.scheduleText ?? "").trim().length > 0, {
    message: "مبالغ اقساط را وارد کنید",
    path: ["scheduleText"],
  });

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function itemToFormValues(item?: RecurringItem, defaultDate?: JalaliDate): FormInput {
  const t = today();
  if (!item) {
    return {
      title: "",
      type: "debt",
      categoryId: "",
      personId: "",
      accountId: "",
      priority: 1,
      dueDay: defaultDate?.day ?? 1,
      defaultAmount: 0,
      frequency: defaultDate ? "once" : "monthly",
      startYear: defaultDate?.year ?? t.year,
      startMonth: defaultDate?.month ?? t.month,
      hasEnd: false,
      hasSchedule: false,
      scheduleText: "",
      reminderDaysBefore: 3,
      notes: "",
    };
  }
  return {
    title: item.title,
    type: item.type,
    categoryId: item.categoryId ?? "",
    personId: item.personId ?? "",
    accountId: item.accountId ?? "",
    priority: item.priority,
    dueDay: item.dueDay,
    defaultAmount: item.defaultAmount,
    frequency: item.frequency,
    startYear: item.startYear,
    startMonth: item.startMonth,
    hasEnd: item.endYear !== undefined,
    endYear: item.endYear,
    endMonth: item.endMonth,
    hasSchedule: !!item.installmentSchedule,
    scheduleText: item.installmentSchedule?.join(", ") ?? "",
    reminderDaysBefore: item.reminderDaysBefore ?? 3,
    notes: item.notes ?? "",
  };
}

interface RecurringItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: RecurringItem;
  defaultDate?: JalaliDate;
  onSaved: () => void;
}

export function RecurringItemForm({ open, onOpenChange, item, defaultDate, onSaved }: RecurringItemFormProps) {
  const categories = useLiveQuery(() => listCategories(), []) ?? [];
  const accounts = useLiveQuery(() => listAccounts(), []) ?? [];
  const people = useLiveQuery(() => listPeople(), [], []) ?? [];
  const [newPersonName, setNewPersonName] = useState("");
  const keepOpen = useUiStore((s) => s.keepFormOpen);
  const setKeepOpen = useUiStore((s) => s.setKeepFormOpen);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: itemToFormValues(item, defaultDate),
  });

  useEffect(() => {
    if (open) reset(itemToFormValues(item, defaultDate));
  }, [open, item, defaultDate, reset]);

  const hasEnd = watch("hasEnd");
  const hasSchedule = watch("hasSchedule");

  const onSubmit = async (values: FormValues) => {
    const installmentSchedule = values.hasSchedule
      ? (values.scheduleText ?? "")
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => !Number.isNaN(n))
      : undefined;

    const payload: Omit<RecurringItem, "id"> = {
      title: values.title,
      type: values.type,
      categoryId: values.categoryId || undefined,
      personId: values.personId || undefined,
      accountId: values.accountId || undefined,
      priority: values.priority,
      dueDay: values.dueDay,
      defaultAmount: values.defaultAmount,
      installmentSchedule,
      frequency: values.frequency,
      startYear: values.startYear,
      startMonth: values.startMonth,
      endYear: values.hasEnd ? values.endYear : undefined,
      endMonth: values.hasEnd ? values.endMonth : undefined,
      isActive: true,
      reminderDaysBefore: values.reminderDaysBefore,
      notes: values.notes || undefined,
    };

    if (item) {
      await updateRecurringItem(item.id, payload);
    } else {
      await addRecurringItem(payload);
    }

    const years = [today().year, values.startYear, values.hasEnd && values.endYear ? values.endYear : today().year];
    await ensureYearsGenerated(years);

    if (!item && keepOpen) {
      // Keep the type/category/account/person/dates so a batch can be entered quickly.
      reset({
        title: "",
        type: values.type,
        categoryId: values.categoryId,
        personId: values.personId,
        accountId: values.accountId,
        priority: values.priority,
        dueDay: values.dueDay,
        defaultAmount: 0,
        frequency: values.frequency,
        startYear: values.startYear,
        startMonth: values.startMonth,
        hasEnd: values.hasEnd,
        endYear: values.endYear,
        endMonth: values.endMonth,
        hasSchedule: false,
        scheduleText: "",
        reminderDaysBefore: values.reminderDaysBefore,
        notes: "",
      });
      setFocus("title");
      return;
    }

    onSaved();
    onOpenChange(false);
  };

  const handleAddPerson = async () => {
    if (!newPersonName.trim()) return;
    await addPerson(newPersonName.trim());
    setNewPersonName("");
  };

  const monthOptions = MONTH_NAMES_FA.map((label, idx) => ({ value: String(idx + 1), label }));

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={item ? "ویرایش آیتم" : "افزودن بدهی / قسط / درآمد جدید"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>عنوان</Label>
          <Input {...register("title")} placeholder="مثلا: اجاره خونه" />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>نوع</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <SelectField value={field.value} onChange={field.onChange} options={ITEM_TYPE_OPTIONS} />
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
            <div className="mt-1 flex gap-1">
              <Input
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                placeholder="نام شخص جدید..."
                className="text-xs"
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleAddPerson}>
                افزودن
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>اولویت (عدد کوچک‌تر = مهم‌تر)</Label>
            <Input type="number" {...register("priority")} />
          </div>
          <div>
            <Label>روز سررسید</Label>
            <Input type="number" min={1} max={31} {...register("dueDay")} />
          </div>
          <div>
            <Label>مبلغ پیش‌فرض (ریال)</Label>
            <Controller
              control={control}
              name="defaultAmount"
              render={({ field }) => <AmountInput value={field.value as number | undefined} onChange={field.onChange} />}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>تکرار</Label>
            <Controller
              control={control}
              name="frequency"
              render={({ field }) => (
                <SelectField
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: "monthly", label: "ماهانه" },
                    { value: "once", label: "یک‌بار" },
                  ]}
                />
              )}
            />
          </div>
          <div>
            <Label>سال شروع</Label>
            <Input type="number" {...register("startYear")} />
          </div>
          <div>
            <Label>ماه شروع</Label>
            <Controller
              control={control}
              name="startMonth"
              render={({ field }) => (
                <SelectField
                  value={String(field.value)}
                  onChange={(v) => field.onChange(Number(v))}
                  options={monthOptions}
                />
              )}
            />
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <label className="flex items-center gap-2 text-sm">
            <Controller
              control={control}
              name="hasEnd"
              render={({ field }) => (
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            این آیتم تاریخ پایان مشخصی دارد
          </label>
          {hasEnd && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>سال پایان</Label>
                <Input type="number" {...register("endYear")} />
              </div>
              <div>
                <Label>ماه پایان</Label>
                <Controller
                  control={control}
                  name="endMonth"
                  render={({ field }) => (
                    <SelectField
                      value={field.value ? String(field.value) : ""}
                      onChange={(v) => field.onChange(Number(v))}
                      options={monthOptions}
                    />
                  )}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <label className="flex items-center gap-2 text-sm">
            <Controller
              control={control}
              name="hasSchedule"
              render={({ field }) => (
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            مبلغ اقساط در ماه‌های مختلف متفاوت است
          </label>
          {hasSchedule && (
            <div>
              <Label>مبالغ به ترتیب ماه، با ویرگول جدا شود</Label>
              <Textarea rows={2} {...register("scheduleText")} placeholder="مثلا: 1000000, 1000000, 950000" />
              {errors.scheduleText && (
                <p className="mt-1 text-xs text-red-600">{errors.scheduleText.message}</p>
              )}
            </div>
          )}
        </div>

        <div>
          <Label>یادآوری قبل از سررسید (روز)</Label>
          <Input type="number" min={0} max={60} className="max-w-32" {...register("reminderDaysBefore")} />
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            مثلاً ۲ یعنی از دو روز قبل هشدار داده شود؛ صفر یعنی فقط همان روز سررسید.
          </p>
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
