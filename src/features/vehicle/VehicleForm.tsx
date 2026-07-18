import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
import { addVehicle, updateVehicle } from "@/db/repositories/vehicles";
import { today } from "@/domain/jalali";
import type { Vehicle } from "@/types/entities";

const schema = z.object({
  name: z.string().min(1, "نام خودرو الزامی است"),
  plateNumber: z.string().optional(),
  currentKm: z.coerce.number().int().min(0).optional(),
  notes: z.string().optional(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function vehicleToFormValues(vehicle: Vehicle | undefined): FormInput {
  return {
    name: vehicle?.name ?? "",
    plateNumber: vehicle?.plateNumber ?? "",
    currentKm: vehicle?.currentKm,
    notes: vehicle?.notes ?? "",
  };
}

interface VehicleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: Vehicle;
  onSaved: () => void;
}

export function VehicleForm({ open, onOpenChange, vehicle, onSaved }: VehicleFormProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: vehicleToFormValues(vehicle),
  });

  useEffect(() => {
    if (open) reset(vehicleToFormValues(vehicle));
  }, [open, vehicle, reset]);

  const onSubmit = async (values: FormValues) => {
    // Whenever the current km changes, stamp today's date so it's clear how fresh
    // the reading is (used to gauge km-based service due-dates).
    const kmChanged = values.currentKm !== vehicle?.currentKm;
    const payload: Omit<Vehicle, "id"> = {
      name: values.name,
      plateNumber: values.plateNumber || undefined,
      currentKm: values.currentKm,
      currentKmJalaliDate:
        values.currentKm != null
          ? kmChanged
            ? today()
            : vehicle?.currentKmJalaliDate ?? today()
          : undefined,
      notes: values.notes || undefined,
      isArchived: vehicle?.isArchived ?? false,
    };

    if (vehicle) {
      await updateVehicle(vehicle.id, payload);
    } else {
      await addVehicle(payload);
    }
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={vehicle ? "ویرایش خودرو" : "افزودن خودرو"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>نام خودرو</Label>
          <Input {...register("name")} placeholder="مثلا: پژو ۲۰۶" />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>شماره پلاک</Label>
            <Input {...register("plateNumber")} placeholder="اختیاری" />
          </div>
          <div>
            <Label>کیلومتر فعلی</Label>
            <Controller
              control={control}
              name="currentKm"
              render={({ field }) => (
                <AmountInput value={field.value as number | undefined} onChange={field.onChange} placeholder="مثلا: ۱۲۰۰۰۰" />
              )}
            />
          </div>
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
            {vehicle ? "ذخیره تغییرات" : "افزودن"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
