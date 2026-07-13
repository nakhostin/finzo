import { db } from "@/db/db";
import { compareJalaliDate } from "@/domain/jalali";
import type { AssetType, AssetLot, RateSnapshot } from "@/types/entities";

export function listAssetTypes(): Promise<AssetType[]> {
  return db.assetTypes.filter((a) => !a.isArchived).toArray();
}

export function getAssetType(id: string): Promise<AssetType | undefined> {
  return db.assetTypes.get(id);
}

export async function addAssetType(assetType: Omit<AssetType, "id" | "isArchived">): Promise<AssetType> {
  const full: AssetType = { ...assetType, id: crypto.randomUUID(), isArchived: false };
  await db.assetTypes.add(full);
  return full;
}

export function updateAssetType(id: string, changes: Partial<Omit<AssetType, "id">>): Promise<number> {
  return db.assetTypes.update(id, changes);
}

/** Removes an asset type along with all of its buy/sell lots and rate history. */
export async function deleteAssetType(id: string): Promise<void> {
  await db.transaction("rw", db.assetTypes, db.assetLots, db.rateSnapshots, async () => {
    await db.assetLots.where("assetTypeId").equals(id).delete();
    await db.rateSnapshots.where("assetTypeId").equals(id).delete();
    await db.assetTypes.delete(id);
  });
}

export function listLotsForType(assetTypeId: string): Promise<AssetLot[]> {
  return db.assetLots.where("assetTypeId").equals(assetTypeId).toArray();
}

export async function addLot(lot: Omit<AssetLot, "id">): Promise<AssetLot> {
  const full: AssetLot = { ...lot, id: crypto.randomUUID() };
  await db.assetLots.add(full);
  return full;
}

export function deleteLot(id: string): Promise<void> {
  return db.assetLots.delete(id);
}

export async function getLatestRate(assetTypeId: string): Promise<RateSnapshot | undefined> {
  const snapshots = await db.rateSnapshots.where("assetTypeId").equals(assetTypeId).toArray();
  return snapshots.sort((a, b) => compareJalaliDate(b.jalaliDate, a.jalaliDate))[0];
}

export function listRateSnapshots(assetTypeId: string): Promise<RateSnapshot[]> {
  return db.rateSnapshots.where("assetTypeId").equals(assetTypeId).toArray();
}

/**
 * Upserts by day: registering a rate for a date that already has one updates
 * it in place instead of adding a duplicate. Without this, two same-day
 * snapshots tie under `compareJalaliDate` and which one `getLatestRate` picks
 * as "latest" is arbitrary (IndexedDB has no stable secondary order over a
 * random UUID id) — so re-registering today's rate could silently appear to
 * do nothing.
 */
export async function addRateSnapshot(snapshot: Omit<RateSnapshot, "id">): Promise<RateSnapshot> {
  const existingForType = await db.rateSnapshots.where("assetTypeId").equals(snapshot.assetTypeId).toArray();
  const sameDay = existingForType.find((s) => compareJalaliDate(s.jalaliDate, snapshot.jalaliDate) === 0);

  if (sameDay) {
    await db.rateSnapshots.update(sameDay.id, { rate: snapshot.rate });
    return { ...sameDay, rate: snapshot.rate };
  }

  const full: RateSnapshot = { ...snapshot, id: crypto.randomUUID() };
  await db.rateSnapshots.add(full);
  return full;
}
