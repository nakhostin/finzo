import { db } from "@/db/db";
import type { AutoBackupStatus, AutoBackupResult } from "@/lib/autoBackupTypes";

export type { AutoBackupStatus, AutoBackupResult };

const DIR_HANDLE_KEY = "backupDirHandle";
const BACKUP_FILE_NAME = "finance-backup.json";

async function getStoredHandle(): Promise<FileSystemDirectoryHandle | undefined> {
  const row = await db.appSettings.get(DIR_HANDLE_KEY);
  return row?.value as FileSystemDirectoryHandle | undefined;
}

async function hasPermission(
  handle: FileSystemDirectoryHandle,
  requestIfNeeded: boolean,
): Promise<boolean> {
  const descriptor: FileSystemHandlePermissionDescriptor = { mode: "readwrite" };
  if ((await handle.queryPermission(descriptor)) === "granted") return true;
  if (!requestIfNeeded) return false;
  try {
    return (await handle.requestPermission(descriptor)) === "granted";
  } catch {
    // requestPermission throws if not called from a user gesture (e.g. a
    // background debounced write) — treat as "not granted" rather than crash.
    return false;
  }
}

export function isSupported(): boolean {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

export async function getStatus(): Promise<AutoBackupStatus> {
  const handle = await getStoredHandle();
  if (!handle) return { configured: false };
  const permissionGranted = await hasPermission(handle, false);
  return { configured: true, label: handle.name, permissionGranted };
}

export async function choosePath(): Promise<AutoBackupResult & { label?: string }> {
  if (!isSupported()) return { ok: false, error: "unsupported" };
  try {
    const handle = await window.showDirectoryPicker!({ mode: "readwrite" });
    await db.appSettings.put({ key: DIR_HANDLE_KEY, value: handle });
    return { ok: true, label: handle.name };
  } catch {
    return { ok: false, error: "unknown" };
  }
}

export async function writeBackup(json: string): Promise<AutoBackupResult> {
  const handle = await getStoredHandle();
  if (!handle) return { ok: false, error: "no-path" };
  const granted = await hasPermission(handle, true);
  if (!granted) return { ok: false, error: "permission" };
  try {
    const fileHandle = await handle.getFileHandle(BACKUP_FILE_NAME, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(json);
    await writable.close();
    return { ok: true };
  } catch {
    return { ok: false, error: "unknown" };
  }
}

export async function requestPermission(): Promise<boolean> {
  const handle = await getStoredHandle();
  if (!handle) return false;
  return hasPermission(handle, true);
}

export async function clear(): Promise<void> {
  await db.appSettings.delete(DIR_HANDLE_KEY);
}
