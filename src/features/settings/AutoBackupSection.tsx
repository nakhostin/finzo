import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as autoBackup from "@/lib/autoBackup";
import { runAutoBackupNow, getLastAutoBackupResult, subscribeToAutoBackupResult } from "@/domain/autoBackupRunner";
import type { AutoBackupStatus } from "@/lib/autoBackupTypes";

export function AutoBackupSection() {
  const [status, setStatus] = useState<AutoBackupStatus | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [lastResult, setLastResult] = useState(getLastAutoBackupResult());

  const supported = autoBackup.isSupported();

  const refreshStatus = async () => {
    setStatus(await autoBackup.getStatus());
  };

  useEffect(() => {
    refreshStatus();
    return subscribeToAutoBackupResult(() => setLastResult(getLastAutoBackupResult()));
  }, []);

  const handleChoose = async () => {
    setIsBusy(true);
    try {
      await autoBackup.choosePath();
      await refreshStatus();
    } finally {
      setIsBusy(false);
    }
  };

  const handleReconnect = async () => {
    setIsBusy(true);
    try {
      await autoBackup.requestPermission();
      await refreshStatus();
    } finally {
      setIsBusy(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("مسیر بکاپ خودکار حذف شود؟ فایل‌های قبلی دست‌نخورده می‌مانند.")) return;
    await autoBackup.clear();
    await refreshStatus();
  };

  const handleBackupNow = async () => {
    setIsBusy(true);
    try {
      await runAutoBackupNow();
    } finally {
      setIsBusy(false);
    }
  };

  if (!supported) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-700">
        این مرورگر از بکاپ خودکار پشتیبانی نمی‌کند. از Chrome یا Edge استفاده کنید، یا از نسخه دسکتاپ برنامه، یا
        به‌صورت دستی از بخش «پشتیبان‌گیری و بازیابی» فایل دانلود کنید.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {status?.configured ? `مسیر بکاپ: ${status.label}` : "مسیری برای بکاپ خودکار تنظیم نشده"}
          </p>
          {status?.configured && status.permissionGranted === false && (
            <p className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle size={12} />
              دسترسی نوشتن نیاز به تأیید مجدد دارد
            </p>
          )}
          {status?.configured && status.permissionGranted !== false && lastResult?.ok && (
            <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={12} />
              آخرین بکاپ موفق بود
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {status?.configured && status.permissionGranted === false && (
            <Button variant="secondary" size="sm" onClick={handleReconnect} disabled={isBusy}>
              اتصال مجدد
            </Button>
          )}
          {status?.configured && (
            <Button variant="ghost" size="sm" onClick={handleClear} disabled={isBusy}>
              حذف مسیر
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handleChoose} disabled={isBusy}>
            {status?.configured ? "تغییر مسیر" : "انتخاب مسیر"}
          </Button>
        </div>
      </div>

      {status?.configured && (
        <Button variant="secondary" onClick={handleBackupNow} disabled={isBusy}>
          <RefreshCw size={16} />
          بکاپ‌گیری فوری
        </Button>
      )}

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        با هر تغییری در اطلاعات، فایل «finance-backup.json» در این مسیر به‌طور خودکار به‌روزرسانی می‌شود. این فایل
        فقط برای بازیابی دستی در آینده است؛ برنامه هیچ‌وقت خودش از روی آن چیزی نمی‌خواند.
      </p>
    </div>
  );
}
