import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, useNavigate } from "react-router";
import { Plus } from "lucide-react";
import { db } from "@/db/db";
import { listAssetTypes } from "@/db/repositories/assets";
import { valueAssetPosition } from "@/domain/costBasis";
import { compareJalaliDate } from "@/domain/jalali";
import { ASSET_CATEGORY_OPTIONS, resolveAssetCategory } from "@/domain/assetCategories";
import { formatRial, formatNumber } from "@/lib/format";
import { cardLinkClassName } from "@/lib/cardStyles";
import { Button } from "@/components/ui/button";
import { AssetTypeForm } from "@/features/assets/AssetTypeForm";
import type { AssetCategory, AssetType } from "@/types/entities";

export function AssetsPage() {
  const assetTypes = useLiveQuery(() => listAssetTypes(), [], []);
  const allLots = useLiveQuery(() => db.assetLots.toArray(), [], []);
  const allRates = useLiveQuery(() => db.rateSnapshots.toArray(), [], []);
  const [formOpen, setFormOpen] = useState(false);
  const navigate = useNavigate();

  const valuationByType = useMemo(() => {
    const map = new Map<string, ReturnType<typeof valueAssetPosition>>();
    for (const assetType of assetTypes ?? []) {
      const lots = (allLots ?? []).filter((l) => l.assetTypeId === assetType.id);
      const rates = (allRates ?? [])
        .filter((r) => r.assetTypeId === assetType.id)
        .sort((a, b) => compareJalaliDate(b.jalaliDate, a.jalaliDate));
      const currentRate = rates[0]?.rate ?? 0;
      map.set(assetType.id, valueAssetPosition(lots, currentRate));
    }
    return map;
  }, [assetTypes, allLots, allRates]);

  const grouped = useMemo(() => {
    const map = new Map<AssetCategory, AssetType[]>();
    for (const opt of ASSET_CATEGORY_OPTIONS) map.set(opt.value, []);
    for (const assetType of assetTypes ?? []) {
      map.get(resolveAssetCategory(assetType))?.push(assetType);
    }
    return map;
  }, [assetTypes]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">دارایی‌ها</h2>
        <Button onClick={() => setFormOpen(true)}>
          <Plus size={16} />
          افزودن دارایی جدید
        </Button>
      </div>

      {ASSET_CATEGORY_OPTIONS.map(({ value, label }) => {
        const items = grouped.get(value) ?? [];
        if (items.length === 0) return null;
        return (
          <section key={value}>
            <h3 className="mb-3 text-lg font-semibold">{label}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((assetType) => {
                const valuation = valuationByType.get(assetType.id);
                const plTone =
                  valuation && valuation.unrealizedPL + valuation.realizedPL >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400";
                return (
                  <Link key={assetType.id} to={`/assets/${assetType.id}`} className={cardLinkClassName}>
                    <h3 className="font-semibold">{assetType.nameFa}</h3>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                      موجودی: {formatNumber(valuation?.quantityHeld ?? 0)} {assetType.unit}
                    </p>
                    <p className="mt-2 text-lg font-bold">{formatRial(valuation?.currentValue ?? 0)}</p>
                    {valuation && (valuation.unrealizedPL !== 0 || valuation.realizedPL !== 0) && (
                      <p className={`mt-1 text-xs font-medium ${plTone}`}>
                        سود/زیان: {formatRial(valuation.unrealizedPL + valuation.realizedPL)}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      {assetTypes && assetTypes.length === 0 && (
        <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
          هنوز دارایی‌ای ثبت نشده است. با دکمه «افزودن دارایی جدید» ارز، فلز، رمزارز یا سهام بورسی اضافه کنید.
        </p>
      )}

      <AssetTypeForm open={formOpen} onOpenChange={setFormOpen} onSaved={(id) => navigate(`/assets/${id}`)} />
    </div>
  );
}
