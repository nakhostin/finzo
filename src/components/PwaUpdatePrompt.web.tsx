import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    navigator.storage?.persist?.().catch(() => {});
  }, []);

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="fixed bottom-4 start-4 z-50 flex items-center gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-sm">
        {needRefresh
          ? "نسخه جدید اپ آماده است."
          : "اپ برای استفاده کاملاً آفلاین آماده شد."}
      </p>
      {needRefresh && (
        <Button size="sm" onClick={() => updateServiceWorker(true)}>
          بارگذاری مجدد
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setNeedRefresh(false);
          setOfflineReady(false);
        }}
      >
        بستن
      </Button>
    </div>
  );
}
