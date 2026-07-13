import { db } from "@/db/db";
import { buildBackupPayload } from "@/domain/backup";
import * as autoBackup from "@/lib/autoBackup";

const DEBOUNCE_MS = 2000;

let dirty = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let lastResult: { ok: boolean; error?: string; at: string } | undefined;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

async function flush() {
  timer = null;
  if (!dirty) return;
  dirty = false;

  const status = await autoBackup.getStatus();
  if (!status.configured) return;

  const payload = await buildBackupPayload();
  const result = await autoBackup.writeBackup(JSON.stringify(payload));
  lastResult = { ...result, at: new Date().toISOString() };
  notify();
}

function scheduleBackup() {
  dirty = true;
  if (timer) return;
  timer = setTimeout(flush, DEBOUNCE_MS);
}

/** Registers Dexie hooks so every create/update/delete queues a debounced automatic backup write. */
export function initAutoBackup(): void {
  for (const table of db.tables) {
    if (table.name === "appSettings") continue;
    table.hook("creating", () => scheduleBackup());
    table.hook("updating", () => scheduleBackup());
    table.hook("deleting", () => scheduleBackup());
  }
}

export function getLastAutoBackupResult() {
  return lastResult;
}

export function subscribeToAutoBackupResult(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Forces an immediate backup write, bypassing the debounce (used by the "backup now" button). */
export async function runAutoBackupNow(): Promise<{ ok: boolean; error?: string }> {
  const payload = await buildBackupPayload();
  const result = await autoBackup.writeBackup(JSON.stringify(payload));
  lastResult = { ...result, at: new Date().toISOString() };
  notify();
  return result;
}
