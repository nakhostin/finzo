import { z } from "zod";
import { db } from "@/db/db";

const BACKUP_SCHEMA_VERSION = 1;

const backupFileSchema = z.object({
  schemaVersion: z.number(),
  exportedAt: z.string(),
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});

export interface BackupSummary {
  [tableName: string]: number;
}

/** Snapshots every table into the same JSON shape used by manual export, automatic backups, and restore. */
export async function buildBackupPayload(): Promise<{
  schemaVersion: number;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}> {
  const tables: Record<string, unknown[]> = {};
  for (const table of db.tables) {
    // appSettings holds platform-specific plumbing (e.g. a File System Access
    // API directory handle) that isn't JSON-serializable and isn't user data.
    if (table.name === "appSettings") continue;
    tables[table.name] = await table.toArray();
  }

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
  };
}

export async function exportBackup(): Promise<void> {
  const payload = await buildBackupPayload();

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `backup-${payload.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Replaces all local data with the contents of a previously exported backup file.
 * Table names not present in the current schema are ignored (forward-compatible
 * with old backups after new tables are added); unknown extra keys in the file
 * are ignored too.
 */
export async function importBackup(file: File): Promise<BackupSummary> {
  const text = await file.text();
  const parsed = backupFileSchema.parse(JSON.parse(text));

  const tableNames = db.tables.map((t) => t.name).filter((name) => name in parsed.tables);
  const summary: BackupSummary = {};

  await db.transaction("rw", tableNames.map((name) => db.table(name)), async () => {
    for (const name of tableNames) {
      const table = db.table(name);
      await table.clear();
      const rows = parsed.tables[name];
      if (rows.length > 0) await table.bulkAdd(rows);
      summary[name] = rows.length;
    }
  });

  return summary;
}
