import { db } from "@/db/db";
import type { MaintenanceRecord } from "@/types/entities";

export function listMaintenanceRecords(): Promise<MaintenanceRecord[]> {
  return db.maintenanceRecords.toArray();
}

export function listMaintenanceRecordsForVehicle(vehicleId: string): Promise<MaintenanceRecord[]> {
  return db.maintenanceRecords.where("vehicleId").equals(vehicleId).toArray();
}

export async function addMaintenanceRecord(
  record: Omit<MaintenanceRecord, "id">,
): Promise<MaintenanceRecord> {
  const full: MaintenanceRecord = { ...record, id: crypto.randomUUID() };
  await db.maintenanceRecords.add(full);
  return full;
}

export function updateMaintenanceRecord(
  id: string,
  changes: Partial<Omit<MaintenanceRecord, "id">>,
): Promise<number> {
  return db.maintenanceRecords.update(id, changes);
}

export function deleteMaintenanceRecord(id: string): Promise<void> {
  return db.maintenanceRecords.delete(id);
}
