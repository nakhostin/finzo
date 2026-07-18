import { db } from "@/db/db";
import type { Vehicle } from "@/types/entities";

export function listVehicles(): Promise<Vehicle[]> {
  return db.vehicles.toArray();
}

export async function addVehicle(vehicle: Omit<Vehicle, "id">): Promise<Vehicle> {
  const full: Vehicle = { ...vehicle, id: crypto.randomUUID() };
  await db.vehicles.add(full);
  return full;
}

export function updateVehicle(
  id: string,
  changes: Partial<Omit<Vehicle, "id">>,
): Promise<number> {
  return db.vehicles.update(id, changes);
}

/** Deletes a vehicle together with all of its maintenance records. */
export async function deleteVehicle(id: string): Promise<void> {
  await db.transaction("rw", db.vehicles, db.maintenanceRecords, async () => {
    await db.maintenanceRecords.where("vehicleId").equals(id).delete();
    await db.vehicles.delete(id);
  });
}
