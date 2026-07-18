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
import { Checkbox } from "@/components/ui/checkbox";
import { JalaliDateField } from "@/components/JalaliDateField";
import { KeepOpenToggle } from "@/components/ui/keep-open-toggle";
import { addMaintenanceRecord, updateMaintenanceRecord } from "@/db/repositories/maintenanceRecords";
import { today } from "@/domain/jalali";
import { MAINTENANCE_TYPES_FA } from "@/domain/vehicleMaintenance";
import { useUiStore } from "@/stores/uiStore";
import type { JalaliDate, MaintenanceRecord } from "@/types/entities";

const CUSTOM = "__custom__";

const jalaliSchema = z.object({
  year: z.coerce.number().int().min(1300).max(1500),
  month: z.coerce.number().int().min(1).max(12),
  day: z.coerce.number().int().min(1).max(31),
});

const schema = z
  .object({
    typePreset: z.string().min(1, "نوع سرویس را انتخاب کنید"),
    customType: z.string().optional(),
    brand: z.string().optional(),
    doneDate: jalaliSchema,
    doneKm: z.coerce.number().int().min(0).optional(),
    hasNextDate: z.boolean(),
    nextDate: jalaliSchema,
    nextKm: z.coerce.number().int().min(0).optional(),
    notes: z.string().optional(),
  })
  .refine((d) => d.typePreset !== CUSTOM || (d.customType?.trim().length ?? 0) > 0, {
    message: "نوع سرویس را وارد کنید",
    path: ["customType"],
  });

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function recordToFormValues(record: MaintenanceRecord | undefined): FormInput {
  const isPreset = record ? (MAINTENANCE_TYPES_FA as readonly string[]).includes(record.type) : true;
  return {
    typePreset: record ? (isPreset ? record.type : CUSTOM) : MAINTENANCE_TYPES_FA[0],
    customType: record && !isPreset ? record.type : "",
    brand: record?.brand ?? "",
    doneDate: record?.doneJalaliDate ?? today(),
    doneKm: record?.doneKm,
    hasNextDate: record?.nextJalaliDate != null,
    nextDate: record?.nextJalaliDate ?? today(),
    nextKm: record?.nextKm,
    notes: record?.notes ?? "",
  };
}

const TYPE_OPTIONS = [
  ...MAINTENANCE_TYPES_FA.map((t) => ({ value: t, label: t })),
  { value: CUSTOM, label: "سایر (وارد کردن دستی)" },
];

interface MaintenanceRecordFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  record?: MaintenanceRecord;
  onSaved: () => void;
}

export function MaintenanceRecordForm({
  open,
  onOpenChange,
  vehicleId,
  record,
  onSaved,
}: MaintenanceRecordFormProps) {
  const keepOpen = useUiStore((s) => s.keepFormOpen);
  const setKeepOpen = useUiStore((s) => s.setKeepFormOpen);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: recordToFormValues(record),
  });

  useEffect(() => {
    if (open) reset(recordToFormValues(record));
  }, [open, record, reset]);

  const typePreset = watch("typePreset");
  const hasNextDate = watch("hasNextDate");

  const onSubmit = async (values: FormValues) => {
    const type = values.typePreset === CUSTOM ? values.customType!.trim() : values.typePreset;
    const payload: Omit<MaintenanceRecord, "id"> = {
      vehicleId,
      type,
      brand: values.brand?.trim() || undefined,
      doneJalaliDate: values.doneDate,
      doneKm: values.doneKm,
      nextJalaliDate: values.hasNextDate ? values.nextDate : undefined,
      nextKm: values.nextKm,
      notes: values.notes?.trim() || undefined,
    };

    if (record) {
      await updateMaintenanceRecord(record.id, payload);
    } else {
      await addMaintenanceRecord(payload);
    }

    // Batch entry: keep the dialog open and reset for the next record, keeping the
    // service type so several same-type/related records go in quickly.
    if (!record && keepOpen) {
      reset({
        ...recordToFormValues(undefined),
        typePreset: values.typePreset,
        customType: values.customType,
      });
      setFocus("brand");
      return;
    }

    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={record ? "ویرایش سابقه سرویس" : "ثبت سرویس / تعویض"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>نوع سرویس</Label>
            <Controller
              control={control}
              name="typePreset"
              render={({ field }) => (
                <SelectField value={field.value} onChange={field.onChange} options={TYPE_OPTIONS} />
              )}
            />
          </div>
          <div>
            <Label>نام / برند محصول</Label>
            <Input {...register("brand")} placeholder="مثلا: بهران پیشتاز" />
          </div>
        </div>

        {typePreset === CUSTOM && (
          <div>
            <Label>نوع سرویس (دلخواه)</Label>
            <Input {...register("customType")} placeholder="مثلا: تعویض واتر پمپ" />
            {errors.customType && <p className="mt-1 text-xs text-red-600">{errors.customType.message}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>تاریخ انجام</Label>
            <Controller
              control={control}
              name="doneDate"
              render={({ field }) => (
                <JalaliDateField value={field.value as JalaliDate} onChange={field.onChange} />
              )}
            />
          </div>
          <div>
            <Label>کیلومتر هنگام انجام</Label>
            <Controller
              control={control}
              name="doneKm"
              render={({ field }) => (
                <AmountInput value={field.value as number | undefined} onChange={field.onChange} />
              )}
            />
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200/80 p-3 dark:border-neutral-800">
          <p className="mb-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            تعویض بعدی (اختیاری)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Controller
                control={control}
                name="hasNextDate"
                render={({ field }) => (
                  <label className="flex cursor-pointer items-center gap-2">
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    <span className="text-xs text-neutral-600 dark:text-neutral-300">تاریخ تعویض بعدی</span>
                  </label>
                )}
              />
              {hasNextDate && (
                <div className="mt-2">
                  <Controller
                    control={control}
                    name="nextDate"
                    render={({ field }) => (
                      <JalaliDateField value={field.value as JalaliDate} onChange={field.onChange} />
                    )}
                  />
                </div>
              )}
            </div>
            <div>
              <Label>کیلومتر تعویض بعدی</Label>
              <Controller
                control={control}
                name="nextKm"
                render={({ field }) => (
                  <AmountInput value={field.value as number | undefined} onChange={field.onChange} placeholder="مثلا: ۱۳۰۰۰۰" />
                )}
              />
            </div>
          </div>
        </div>

        <div>
          <Label>توضیحات</Label>
          <Textarea rows={2} {...register("notes")} />
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          {record ? <span /> : <KeepOpenToggle checked={keepOpen} onCheckedChange={setKeepOpen} />}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              انصراف
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {record ? "ذخیره تغییرات" : "ثبت"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
