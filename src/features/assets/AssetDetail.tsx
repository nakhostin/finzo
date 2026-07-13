import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight, Plus, Trash2, Pencil, Archive, ArchiveRestore } from "lucide-react";
import {
  getAssetType,
  listLotsForType,
  listRateSnapshots,
  addRateSnapshot,
  updateAssetType,
  deleteAssetType,
  deleteLot,
} from "@/db/repositories/assets";
import { valueAssetPosition } from "@/domain/costBasis";
import { compareJalaliDate, today, monthLabel } from "@/domain/jalali";
import { formatRial, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { AmountInput } from "@/components/ui/amount-input";
import { LotForm } from "@/features/assets/LotForm";
import { AssetTypeForm } from "@/features/assets/AssetTypeForm";

export function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const assetType = useLiveQuery(() => (id ? getAssetType(id) : undefined), [id]);
  const lots = useLiveQuery(() => (id ? listLotsForType(id) : []), [id], []);
  const rates = useLiveQuery(() => (id ? listRateSnapshots(id) : []), [id], []);
  const [formOpen, setFormOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [newRate, setNewRate] = useState<number | undefined>(undefined);

  const latestRate = useMemo(
    () => [...(rates ?? [])].sort((a, b) => compareJalaliDate(b.jalaliDate, a.jalaliDate))[0],
    [rates],
  );

  const valuation = useMemo(
    () => valueAssetPosition(lots ?? [], latestRate?.rate ?? 0),
    [lots, latestRate],
  );

  const sortedLots = useMemo(
    () => [...(lots ?? [])].sort((a, b) => compareJalaliDate(b.jalaliDate, a.jalaliDate)),
    [lots],
  );

  const handleSetRate = async () => {
    if (!id || newRate === undefined || newRate <= 0) return;
    await addRateSnapshot({ assetTypeId: id, rate: newRate, jalaliDate: today() });
    setNewRate(undefined);
  };

  const handleDeleteLot = async (lotId: string) => {
    if (confirm("این تراکنش حذف شود؟")) {
      await deleteLot(lotId);
    }
  };

  const handleToggleArchive = async () => {
    if (!id || !assetType) return;
    await updateAssetType(id, { isArchived: !assetType.isArchived });
    if (!assetType.isArchived) navigate("/assets");
  };

  const handleDeleteAssetType = async () => {
    if (!id) return;
    const count = lots?.length ?? 0;
    if (
      confirm(
        `دارایی «${assetType?.nameFa}» حذف شود؟ این کار ${count} تراکنش خرید/فروش و کل تاریخچه نرخ آن را هم برای همیشه حذف می‌کند.`,
      )
    ) {
      await deleteAssetType(id);
      navigate("/assets");
    }
  };

  if (!assetType) {
    return <p className="text-neutral-500">دارایی یافت نشد.</p>;
  }

  const totalPL = valuation.unrealizedPL + valuation.realizedPL;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            to="/assets"
            className="mb-2 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-blue-700 dark:hover:text-blue-400"
          >
            <ChevronRight size={14} />
            بازگشت به دارایی‌ها
          </Link>
          <h2 className="text-2xl font-bold">{assetType.nameFa}</h2>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditFormOpen(true)} aria-label="ویرایش">
            <Pencil size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleToggleArchive} aria-label="آرشیو">
            {assetType.isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDeleteAssetType} aria-label="حذف">
            <Trash2 size={16} className="text-red-600" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard label="موجودی" value={`${formatNumber(valuation.quantityHeld)} ${assetType.unit}`} />
        <SummaryCard label="میانگین بهای تمام‌شده" value={formatRial(valuation.avgCost)} />
        <SummaryCard label="ارزش روز" value={formatRial(valuation.currentValue)} />
        <SummaryCard
          label="سود/زیان کل"
          value={formatRial(totalPL)}
          tone={totalPL >= 0 ? "success" : "danger"}
        />
      </div>

      <div className="flex items-end gap-2 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex-1">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            نرخ فعلی هر {assetType.unit}:{" "}
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              {latestRate ? formatRial(latestRate.rate) : "ثبت نشده"}
            </span>
          </p>
          <div className="mt-2 flex gap-2">
            <AmountInput placeholder="نرخ جدید (ریال)" value={newRate} onChange={setNewRate} className="max-w-48" />
            <Button variant="secondary" onClick={handleSetRate}>
              ثبت نرخ روز
            </Button>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">تاریخچه تراکنش‌ها</h3>
          <Button onClick={() => setFormOpen(true)}>
            <Plus size={16} />
            افزودن تراکنش
          </Button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-neutral-200/80 shadow-sm dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400">
              <tr>
                <th className="p-3 text-start">نوع</th>
                <th className="p-3 text-start">تاریخ</th>
                <th className="p-3 text-start">مقدار</th>
                <th className="p-3 text-start">قیمت واحد</th>
                <th className="p-3 text-start">مبلغ کل</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {sortedLots.map((lot) => (
                <tr key={lot.id} className="border-t border-neutral-100 transition-colors hover:bg-slate-50/70 dark:border-neutral-800 dark:hover:bg-neutral-800/40">
                  <td className="p-3">
                    <span
                      className={
                        lot.direction === "buy"
                          ? "font-medium text-emerald-600 dark:text-emerald-400"
                          : "font-medium text-red-600 dark:text-red-400"
                      }
                    >
                      {lot.direction === "buy" ? "خرید" : "فروش"}
                    </span>
                  </td>
                  <td className="p-3 text-neutral-500 dark:text-neutral-400">
                    {monthLabel(lot.jalaliDate.month)} {formatNumber(lot.jalaliDate.day)}،{" "}
                    {formatNumber(lot.jalaliDate.year)}
                  </td>
                  <td className="p-3">
                    {formatNumber(lot.quantity)} {assetType.unit}
                  </td>
                  <td className="p-3">{formatRial(lot.unitPrice)}</td>
                  <td className="p-3">{formatRial(lot.quantity * lot.unitPrice)}</td>
                  <td className="p-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteLot(lot.id)}
                      aria-label="حذف"
                    >
                      <Trash2 size={14} className="text-red-600" />
                    </Button>
                  </td>
                </tr>
              ))}
              {sortedLots.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-neutral-500">
                    هنوز تراکنشی ثبت نشده است.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {id && (
        <LotForm
          open={formOpen}
          onOpenChange={setFormOpen}
          assetTypeId={id}
          unit={assetType.unit}
          onSaved={() => setFormOpen(false)}
        />
      )}

      <AssetTypeForm
        open={editFormOpen}
        onOpenChange={setEditFormOpen}
        assetType={assetType}
        onSaved={() => setEditFormOpen(false)}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "danger"
        ? "text-red-600 dark:text-red-400"
        : "text-neutral-800 dark:text-neutral-200";
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className={`mt-1 text-lg font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}
