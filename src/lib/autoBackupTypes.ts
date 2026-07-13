export interface AutoBackupStatus {
  configured: boolean;
  label?: string;
  permissionGranted?: boolean;
}

export interface AutoBackupResult {
  ok: boolean;
  error?: "unsupported" | "no-path" | "permission" | "unknown";
}
