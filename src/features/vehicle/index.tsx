import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Pencil, Trash2, Car, Gauge, Wrench } from "lucide-react";
import { listVehicles, deleteVehicle } from "@/db/repositories/vehicles";
import { listMaintenanceRecords } from "@/db/repositories/maintenanceRecords";
import { deleteMaintenanceRecord } from "@/db/repositories/maintenanceRecords";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { formatJalaliDate, toPersianDigits } from "@/domain/jalali";
import {
  evaluateDueStatus,
  latestPerType,
  type DueLevel,
  type DueStatus,
} from "@/domain/vehicleMaintenance";
import { VehicleForm } from "@/features/vehicle/VehicleForm";
import { MaintenanceRecordForm } from "@/features/vehicle/MaintenanceRecordForm";
import type { MaintenanceRecord, Vehicle } from "@/types/entities";

const formatKm = (km?: number) => (km == null ? "—" : `${formatNumber(km)} کیلومتر`);

const DUE_BADGE_CLASSES: Record<DueLevel, string> = {
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  soon: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  none: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

const DUE_LEVEL_LABEL: Record<DueLevel, string> = {
  overdue: "عقب‌افتاده",
  soon: "نزدیک",
  ok: "به‌موقع",
  none: "بدون زمان‌بندی",
};

/** Builds a compact human description like "۵۰۰ کیلومتر مانده · ۱۲ روز مانده". */
function describeDue(status: DueStatus): string {
  const parts: string[] = [];
  if (status.kmLeft != null) {
    const abs = formatNumber(Math.abs(status.kmLeft));
    parts.push(status.kmLeft < 0 ? `${abs} کیلومتر گذشته` : `${abs} کیلومتر مانده`);
  }
  if (status.daysLeft != null) {
    const abs = toPersianDigits(Math.abs(status.daysLeft));
    parts.push(
      status.daysLeft < 0
        ? `${abs} روز گذشته`
        : status.daysLeft === 0
          ? "امروز"
          : `${abs} روز مانده`,
    );
  }
  return parts.join(" · ") || "—";
}

export function VehiclePage() {
  const vehicles = useLiveQuery(() => listVehicles(), [], []);
  const allRecords = useLiveQuery(() => listMaintenanceRecords(), [], []);

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [vehicleFormOpen, setVehicleFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | undefined>(undefined);
  const [recordFormOpen, setRecordFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | undefined>(undefined);

  const activeVehicles = useMemo(() => (vehicles ?? []).filter((v) => !v.isArchived), [vehicles]);

  // Keep the selected vehicle valid as the list loads or changes.
  useEffect(() => {
    if (activeVehicles.length === 0) {
      setSelectedId(undefined);
      return;
    }
    if (!selectedId || !activeVehicles.some((v) => v.id === selectedId)) {
      setSelectedId(activeVehicles[0].id);
    }
  }, [activeVehicles, selectedId]);

  const selected = activeVehicles.find((v) => v.id === selectedId);

  const records = useMemo(
    () => (allRecords ?? []).filter((r) => r.vehicleId === selectedId),
    [allRecords, selectedId],
  );

  const history = useMemo(
    () =>
      [...records].sort((a, b) => {
        const d = b.doneJalaliDate.year - a.doneJalaliDate.year ||
          b.doneJalaliDate.month - a.doneJalaliDate.month ||
          b.doneJalaliDate.day - a.doneJalaliDate.day;
        return d !== 0 ? d : (b.doneKm ?? 0) - (a.doneKm ?? 0);
      }),
    [records],
  );

  const upcoming = useMemo(() => {
    const rank: Record<DueLevel, number> = { overdue: 0, soon: 1, ok: 2, none: 3 };
    return latestPerType(records)
      .map((r) => ({ record: r, status: evaluateDueStatus(r, selected?.currentKm) }))
      .filter((x) => x.status.level !== "none")
      .sort((a, b) => rank[a.status.level] - rank[b.status.level]);
  }, [records, selected?.currentKm]);

  const openCreateVehicle = () => {
    setEditingVehicle(undefined);
    setVehicleFormOpen(true);
  };
  const openEditVehicle = (v: Vehicle) => {
    setEditingVehicle(v);
    setVehicleFormOpen(true);
  };
  const handleDeleteVehicle = async (v: Vehicle) => {
    if (confirm(`«${v.name}» و همهٔ سوابق سرویس آن حذف شود؟`)) {
      await deleteVehicle(v.id);
    }
  };

  const openCreateRecord = () => {
    setEditingRecord(undefined);
    setRecordFormOpen(true);
  };
  const openEditRecord = (r: MaintenanceRecord) => {
    setEditingRecord(r);
    setRecordFormOpen(true);
  };
  const handleDeleteRecord = async (r: MaintenanceRecord) => {
    if (confirm(`سابقهٔ «${r.type}» حذف شود؟`)) {
      await deleteMaintenanceRecord(r.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">خودرو</h2>
        <Button onClick={openCreateVehicle}>
          <Plus size={16} />
          افزودن خودرو
        </Button>
      </div>

      {activeVehicles.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200/80 p-10 text-center text-neutral-500 shadow-sm dark:border-neutral-800">
          <Car size={40} className="mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
          <p className="mb-4">هنوز خودرویی ثبت نشده است.</p>
          <Button onClick={openCreateVehicle}>
            <Plus size={16} />
            افزودن اولین خودرو
          </Button>
        </div>
      ) : (
        <>
          {activeVehicles.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {activeVehicles.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedId(v.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                    v.id === selectedId
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800",
                  )}
                >
                  <Car size={15} />
                  {v.name}
                </button>
              ))}
            </div>
          )}

          {selected && (
            <>
              <Card className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                    <Car size={22} />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{selected.name}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {selected.plateNumber ? `پلاک: ${toPersianDigits(selected.plateNumber)}` : "بدون پلاک"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                  <Gauge size={18} className="text-neutral-400" />
                  {selected.currentKm != null ? (
                    <span>
                      کیلومتر فعلی: <span className="font-semibold">{formatKm(selected.currentKm)}</span>
                      {selected.currentKmJalaliDate && (
                        <span className="text-neutral-400"> (تا {formatJalaliDate(selected.currentKmJalaliDate)})</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-neutral-400">کیلومتر فعلی ثبت نشده</span>
                  )}
                </div>

                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEditVehicle(selected)} aria-label="ویرایش خودرو">
                    <Pencil size={15} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteVehicle(selected)} aria-label="حذف خودرو">
                    <Trash2 size={15} className="text-red-600" />
                  </Button>
                </div>
              </Card>

              {upcoming.length > 0 && (
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-200">
                    <Wrench size={16} />
                    سرویس‌های پیشِ‌رو
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {upcoming.map(({ record, status }) => (
                      <Card key={record.id} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{record.type}</span>
                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium",
                              DUE_BADGE_CLASSES[status.level],
                            )}
                          >
                            {DUE_LEVEL_LABEL[status.level]}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{describeDue(status)}</p>
                        <p className="text-[11px] text-neutral-400">
                          بعدی:{" "}
                          {record.nextKm != null ? formatKm(record.nextKm) : "—"}
                          {record.nextJalaliDate ? ` · ${formatJalaliDate(record.nextJalaliDate)}` : ""}
                        </p>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-200">سوابق سرویس و تعویض</h3>
                  <Button onClick={openCreateRecord}>
                    <Plus size={16} />
                    ثبت سرویس
                  </Button>
                </div>

                {history.length > 0 ? (
                  <div className="overflow-hidden rounded-2xl border border-neutral-200/80 shadow-sm dark:border-neutral-800">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400">
                        <tr>
                          <th className="p-3 text-start">نوع سرویس</th>
                          <th className="p-3 text-start">نام / برند</th>
                          <th className="p-3 text-start">تاریخ انجام</th>
                          <th className="p-3 text-start">کیلومتر انجام</th>
                          <th className="p-3 text-start">تعویض بعدی</th>
                          <th className="p-3 text-start">توضیحات</th>
                          <th className="p-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((r) => (
                          <tr
                            key={r.id}
                            className="border-t border-neutral-100 transition-colors hover:bg-slate-50/70 dark:border-neutral-800 dark:hover:bg-neutral-800/40"
                          >
                            <td className="p-3 font-medium">{r.type}</td>
                            <td className="p-3 text-neutral-500 dark:text-neutral-400">{r.brand ?? "—"}</td>
                            <td className="p-3">{formatJalaliDate(r.doneJalaliDate)}</td>
                            <td className="p-3">{r.doneKm != null ? formatNumber(r.doneKm) : "—"}</td>
                            <td className="p-3 text-neutral-500 dark:text-neutral-400">
                              {r.nextKm == null && r.nextJalaliDate == null
                                ? "—"
                                : [
                                    r.nextKm != null ? formatKm(r.nextKm) : null,
                                    r.nextJalaliDate ? formatJalaliDate(r.nextJalaliDate) : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                            </td>
                            <td className="p-3 text-neutral-500 dark:text-neutral-400">{r.notes ?? "—"}</td>
                            <td className="p-3">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openEditRecord(r)} aria-label="ویرایش">
                                  <Pencil size={14} />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteRecord(r)} aria-label="حذف">
                                  <Trash2 size={14} className="text-red-600" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-neutral-200/80 p-6 text-center text-neutral-500 shadow-sm dark:border-neutral-800">
                    هنوز سرویسی برای این خودرو ثبت نشده است.
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}

      <VehicleForm
        open={vehicleFormOpen}
        onOpenChange={setVehicleFormOpen}
        vehicle={editingVehicle}
        onSaved={() => setVehicleFormOpen(false)}
      />

      {selectedId && (
        <MaintenanceRecordForm
          open={recordFormOpen}
          onOpenChange={setRecordFormOpen}
          vehicleId={selectedId}
          record={editingRecord}
          onSaved={() => setRecordFormOpen(false)}
        />
      )}
    </div>
  );
}
