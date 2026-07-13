import type { AutoBackupResult, AutoBackupStatus } from "@/lib/autoBackupTypes";

function bridge() {
  const backup = window.electron?.backup;
  if (!backup) throw new Error("Electron backup bridge is unavailable");
  return backup;
}

export function isSupported(): boolean {
  return Boolean(window.electron?.backup);
}

export async function getStatus(): Promise<AutoBackupStatus> {
  const res = await bridge().getStatus();
  return { configured: res.configured, label: res.label, permissionGranted: res.configured };
}

export async function choosePath(): Promise<AutoBackupResult & { label?: string }> {
  const res = await bridge().choosePath();
  if (!res.ok) return { ok: false, error: "unknown" };
  return { ok: true, label: res.label };
}

export async function writeBackup(json: string): Promise<AutoBackupResult> {
  const res = await bridge().write(json);
  if (res.ok) return { ok: true };
  return { ok: false, error: res.error === "no-path" ? "no-path" : "unknown" };
}

export async function requestPermission(): Promise<boolean> {
  // Native filesystem access has no browser-style permission prompt to re-request.
  return true;
}

export async function clear(): Promise<void> {
  await bridge().clear();
}
