import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select";
import { addAssetType, updateAssetType } from "@/db/repositories/assets";
import { ASSET_CATEGORY_OPTIONS, resolveAssetCategory } from "@/domain/assetCategories";
import type { AssetType, AssetCategory } from "@/types/entities";

const schema = z.object({
  nameFa: z.string().min(1, "نام الزامی است"),
  code: z.string().min(1, "کد/نماد الزامی است"),
  unit: z.string().min(1, "واحد الزامی است"),
  category: z.enum(["currency", "metal", "crypto", "stock", "other"]),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

const UNIT_SUGGESTIONS: Partial<Record<AssetCategory, string>> = {
  currency: "دلار",
  metal: "گرم",
  crypto: "عدد",
  stock: "سهم",
  other: "عدد",
};

const DEFAULT_CATEGORY: AssetCategory = "crypto";

function assetTypeToFormValues(assetType?: AssetType): FormInput {
  if (!assetType) {
    return { nameFa: "", code: "", unit: UNIT_SUGGESTIONS[DEFAULT_CATEGORY] ?? "", category: DEFAULT_CATEGORY };
  }
  return {
    nameFa: assetType.nameFa,
    code: assetType.code,
    unit: assetType.unit,
    category: resolveAssetCategory(assetType),
  };
}

interface AssetTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetType?: AssetType;
  onSaved: (id: string) => void;
}

export function AssetTypeForm({ open, onOpenChange, assetType, onSaved }: AssetTypeFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: assetTypeToFormValues(assetType),
  });

  useEffect(() => {
    if (open) reset(assetTypeToFormValues(assetType));
  }, [open, assetType, reset]);

  const category = watch("category");

  const onSubmit = async (values: FormValues) => {
    const payload = {
      nameFa: values.nameFa,
      code: values.code.trim().toUpperCase(),
      unit: values.unit,
      category: values.category,
    };

    let id: string;
    if (assetType) {
      await updateAssetType(assetType.id, payload);
      id = assetType.id;
    } else {
      const created = await addAssetType(payload);
      id = created.id;
    }

    onSaved(id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={assetType ? "ویرایش دارایی" : "افزودن دارایی جدید"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>دسته</Label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <SelectField
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  const suggested = UNIT_SUGGESTIONS[v as AssetCategory];
                  if (suggested && !assetType) setValue("unit", suggested);
                }}
                options={ASSET_CATEGORY_OPTIONS}
              />
            )}
          />
        </div>

        <div>
          <Label>نام فارسی</Label>
          <Input
            {...register("nameFa")}
            placeholder={
              category === "crypto" ? "مثلا: بیت‌کوین" : category === "stock" ? "مثلا: سهام فولاد مبارکه" : "نام دارایی"
            }
          />
          {errors.nameFa && <p className="mt-1 text-xs text-red-600">{errors.nameFa.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>کد / نماد</Label>
            <Input
              dir="ltr"
              {...register("code")}
              placeholder={category === "crypto" ? "BTC" : category === "stock" ? "فولاد" : "کد"}
            />
            {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code.message}</p>}
          </div>
          <div>
            <Label>واحد شمارش</Label>
            <Input {...register("unit")} placeholder="عدد، سهم، گرم، ..." />
            {errors.unit && <p className="mt-1 text-xs text-red-600">{errors.unit.message}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {assetType ? "ذخیره تغییرات" : "افزودن"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
