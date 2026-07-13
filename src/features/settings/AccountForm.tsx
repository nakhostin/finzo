import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select";
import { addAccount, updateAccount } from "@/db/repositories/accounts";
import { toEnglishDigits } from "@/domain/jalali";
import type { Account, AccountType } from "@/types/entities";

const ACCOUNT_TYPE_OPTIONS: Array<{ value: AccountType; label: string }> = [
  { value: "cash", label: "نقدی" },
  { value: "bank", label: "بانکی" },
  { value: "other", label: "سایر" },
];

function formatCardNumber(digits: string): string {
  return digits.match(/.{1,4}/g)?.join(" ") ?? digits;
}

const schema = z.object({
  name: z.string().min(1, "نام حساب الزامی است"),
  type: z.enum(["cash", "bank", "other"]),
  bankName: z.string().optional(),
  cardNumber: z.string().optional(),
  accountNumber: z.string().optional(),
  iban: z.string().optional(),
  initialBalance: z.coerce.number(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function accountToFormValues(account?: Account): FormInput {
  if (!account) {
    return {
      name: "",
      type: "bank",
      bankName: "",
      cardNumber: "",
      accountNumber: "",
      iban: "",
      initialBalance: 0,
    };
  }
  return {
    name: account.name,
    type: account.type,
    bankName: account.bankName ?? "",
    cardNumber: account.cardNumber ?? "",
    accountNumber: account.accountNumber ?? "",
    iban: account.iban ?? "",
    initialBalance: account.initialBalance,
  };
}

interface AccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account;
  onSaved: () => void;
}

export function AccountForm({ open, onOpenChange, account, onSaved }: AccountFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: accountToFormValues(account),
  });

  useEffect(() => {
    if (open) reset(accountToFormValues(account));
  }, [open, account, reset]);

  const type = watch("type");

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      type: values.type,
      bankName: values.bankName || undefined,
      cardNumber: values.cardNumber || undefined,
      accountNumber: values.accountNumber || undefined,
      iban: values.iban || undefined,
      initialBalance: values.initialBalance,
    };

    if (account) {
      await updateAccount(account.id, payload);
    } else {
      await addAccount(payload);
    }
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={account ? "ویرایش حساب" : "افزودن حساب جدید"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>نام حساب</Label>
            <Input {...register("name")} placeholder="مثلا: ملت - حساب اصلی" />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <Label>نوع</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <SelectField value={field.value} onChange={field.onChange} options={ACCOUNT_TYPE_OPTIONS} />
              )}
            />
          </div>
        </div>

        <div>
          <Label>موجودی اولیه (ریال)</Label>
          <Controller
            control={control}
            name="initialBalance"
            render={({ field }) => <AmountInput value={field.value as number | undefined} onChange={field.onChange} />}
          />
        </div>

        {type === "bank" && (
          <>
            <div>
              <Label>نام بانک</Label>
              <Input {...register("bankName")} placeholder="مثلا: بانک ملت" />
            </div>

            <div>
              <Label>شماره کارت</Label>
              <Controller
                control={control}
                name="cardNumber"
                render={({ field }) => (
                  <Input
                    dir="ltr"
                    inputMode="numeric"
                    placeholder="XXXX XXXX XXXX XXXX"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const digits = toEnglishDigits(e.target.value).replace(/\D/g, "").slice(0, 16);
                      field.onChange(formatCardNumber(digits));
                    }}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>شماره حساب</Label>
                <Input dir="ltr" inputMode="numeric" {...register("accountNumber")} />
              </div>
              <div>
                <Label>شماره شبا</Label>
                <Controller
                  control={control}
                  name="iban"
                  render={({ field }) => (
                    <Input
                      dir="ltr"
                      placeholder="IR..."
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  )}
                />
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {account ? "ذخیره تغییرات" : "افزودن"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
