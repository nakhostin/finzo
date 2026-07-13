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
import { KeepOpenToggle } from "@/components/ui/keep-open-toggle";
import { JalaliDateField } from "@/components/JalaliDateField";
import { listAccounts } from "@/db/repositories/accounts";
import { listPeople, addPerson } from "@/db/repositories/people";
import { addCheque, updateCheque } from "@/db/repositories/cheques";
import { today } from "@/domain/jalali";
import { useUiStore } from "@/stores/uiStore";
import type { Cheque, ChequeDirection, JalaliDate } from "@/types/entities";

const jalaliDateSchema = z.object({
  year: z.coerce.number().int().min(1300).max(1500),
  month: z.coerce.number().int().min(1).max(12),
  day: z.coerce.number().int().min(1).max(31),
});

const schema = z.object({
  chequeNumber: z.string().min(1, "شماره چک الزامی است"),
  accountId: z.string().min(1, "حساب را انتخاب کنید"),
  direction: z.enum(["issued", "received"]),
  counterpartyPersonId: z.string(),
  amount: z.coerce.number().positive("مبلغ باید بزرگ‌تر از صفر باشد"),
  issueJalaliDate: jalaliDateSchema,
  dueJalaliDate: jalaliDateSchema,
  reminderDaysBefore: z.coerce.number().int().min(0).max(60),
  notes: z.string().optional(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function chequeToFormValues(cheque?: Cheque, defaultPersonId?: string, defaultDueDate?: JalaliDate): FormInput {
  const t = today();
  if (!cheque) {
    return {
      chequeNumber: "",
      accountId: "",
      direction: "issued",
      counterpartyPersonId: defaultPersonId ?? "",
      amount: 0,
      issueJalaliDate: defaultDueDate ?? t,
      dueJalaliDate: defaultDueDate ?? t,
      reminderDaysBefore: 3,
      notes: "",
    };
  }
  return {
    chequeNumber: cheque.chequeNumber,
    accountId: cheque.accountId,
    direction: cheque.direction,
    counterpartyPersonId: cheque.counterpartyPersonId ?? "",
    amount: cheque.amount,
    issueJalaliDate: cheque.issueJalaliDate,
    dueJalaliDate: cheque.dueJalaliDate,
    reminderDaysBefore: cheque.reminderDaysBefore ?? 3,
    notes: cheque.notes ?? "",
  };
}

interface ChequeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cheque?: Cheque;
  defaultPersonId?: string;
  defaultDueDate?: JalaliDate;
  onSaved: () => void;
}

const DIRECTION_OPTIONS: Array<{ value: ChequeDirection; label: string }> = [
  { value: "issued", label: "صادره (پرداختی من)" },
  { value: "received", label: "دریافتی (از دیگران)" },
];

export function ChequeForm({ open, onOpenChange, cheque, defaultPersonId, defaultDueDate, onSaved }: ChequeFormProps) {
  const accounts = useLiveQuery(() => listAccounts(), [], []);
  const people = useLiveQuery(() => listPeople(), [], []);
  const [newPersonName, setNewPersonName] = useState("");
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
    defaultValues: chequeToFormValues(cheque, defaultPersonId, defaultDueDate),
  });

  useEffect(() => {
    if (open) reset(chequeToFormValues(cheque, defaultPersonId, defaultDueDate));
  }, [open, cheque, defaultPersonId, defaultDueDate, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      chequeNumber: values.chequeNumber,
      accountId: values.accountId,
      direction: values.direction,
      counterpartyPersonId: values.counterpartyPersonId || undefined,
      amount: values.amount,
      issueJalaliDate: values.issueJalaliDate,
      dueJalaliDate: values.dueJalaliDate,
      reminderDaysBefore: values.reminderDaysBefore,
      notes: values.notes || undefined,
    };

    if (cheque) {
      await updateCheque(cheque.id, payload);
    } else {
      await addCheque(payload);
    }

    if (!cheque && keepOpen) {
      // Keep the account/direction/dates so several cheques can be entered quickly.
      reset({
        chequeNumber: "",
        accountId: values.accountId,
        direction: values.direction,
        counterpartyPersonId: values.counterpartyPersonId,
        amount: 0,
        issueJalaliDate: values.issueJalaliDate,
        dueJalaliDate: values.dueJalaliDate,
        reminderDaysBefore: values.reminderDaysBefore,
        notes: "",
      });
      setFocus("chequeNumber");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={cheque ? "ویرایش چک" : "افزودن چک جدید"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>شماره چک</Label>
            <Input {...register("chequeNumber")} />
            {errors.chequeNumber && (
              <p className="mt-1 text-xs text-red-600">{errors.chequeNumber.message}</p>
            )}
          </div>
          <div>
            <Label>نوع چک</Label>
            <Controller
              control={control}
              name="direction"
              render={({ field }) => (
                <SelectField value={field.value} onChange={field.onChange} options={DIRECTION_OPTIONS} />
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
                  placeholder="انتخاب حساب"
                  options={(accounts ?? []).map((a) => ({ value: a.id, label: a.name }))}
                />
              )}
            />
            {errors.accountId && <p className="mt-1 text-xs text-red-600">{errors.accountId.message}</p>}
          </div>
          <div>
            <Label>مبلغ (ریال)</Label>
            <Controller
              control={control}
              name="amount"
              render={({ field }) => <AmountInput value={field.value as number | undefined} onChange={field.onChange} />}
            />
            {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
          </div>
        </div>

        <div>
          <Label>طرف حساب</Label>
          <Controller
            control={control}
            name="counterpartyPersonId"
            render={({ field }) => (
              <SelectField
                value={field.value}
                onChange={field.onChange}
                placeholder="بدون شخص"
                options={(people ?? []).map((p) => ({ value: p.id, label: p.name }))}
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>تاریخ صدور</Label>
            <Controller
              control={control}
              name="issueJalaliDate"
              render={({ field }) => (
                <JalaliDateField value={field.value as JalaliDate} onChange={field.onChange} />
              )}
            />
          </div>
          <div>
            <Label>تاریخ سررسید</Label>
            <Controller
              control={control}
              name="dueJalaliDate"
              render={({ field }) => (
                <JalaliDateField value={field.value as JalaliDate} onChange={field.onChange} />
              )}
            />
          </div>
        </div>

        <div>
          <Label>یادآوری قبل از سررسید (روز)</Label>
          <Input type="number" min={0} max={60} className="max-w-32" {...register("reminderDaysBefore")} />
        </div>

        <div>
          <Label>توضیحات</Label>
          <Textarea rows={2} {...register("notes")} />
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          {cheque ? <span /> : <KeepOpenToggle checked={keepOpen} onCheckedChange={setKeepOpen} />}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              انصراف
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {cheque ? "ذخیره تغییرات" : "افزودن"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
