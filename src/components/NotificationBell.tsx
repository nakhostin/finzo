import { useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import * as RadixDropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell } from "lucide-react";
import { listActiveReminders, type ReminderItem } from "@/domain/notifications";
import { formatRial } from "@/lib/format";
import { toPersianDigits } from "@/domain/jalali";
import { cn } from "@/lib/utils";

const NOTIFIED_STORAGE_KEY = "notifiedReminderIds";

function reminderKey(r: ReminderItem): string {
  return `${r.kind}:${r.id}`;
}

function loadNotifiedToday(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { date: string; ids: string[] };
    return parsed.date === new Date().toDateString() ? new Set(parsed.ids) : new Set();
  } catch {
    return new Set();
  }
}

function saveNotifiedToday(ids: Set<string>) {
  localStorage.setItem(NOTIFIED_STORAGE_KEY, JSON.stringify({ date: new Date().toDateString(), ids: [...ids] }));
}

function dueLabel(daysUntilDue: number): string {
  if (daysUntilDue < 0) return `${toPersianDigits(Math.abs(daysUntilDue))} روز گذشته`;
  if (daysUntilDue === 0) return "امروز سررسید است";
  return `${toPersianDigits(daysUntilDue)} روز مانده`;
}

export function NotificationBell() {
  const reminders = useLiveQuery(() => listActiveReminders(), [], []);
  const notifiedRef = useRef<Set<string>>(loadNotifiedToday());

  useEffect(() => {
    if (!reminders || reminders.length === 0) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    let changed = false;
    for (const r of reminders) {
      const key = reminderKey(r);
      if (notifiedRef.current.has(key)) continue;
      new Notification("یادآوری مالی", { body: `${r.title} — ${dueLabel(r.daysUntilDue)}`, tag: key });
      notifiedRef.current.add(key);
      changed = true;
    }
    if (changed) saveNotifiedToday(notifiedRef.current);
  }, [reminders]);

  const count = reminders?.length ?? 0;
  const notificationsSupported = typeof Notification !== "undefined";
  const permission = notificationsSupported ? Notification.permission : "denied";

  return (
    <RadixDropdownMenu.Root dir="rtl">
      <RadixDropdownMenu.Trigger asChild>
        <button
          type="button"
          className="relative flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          aria-label="یادآوری‌ها"
        >
          <Bell size={18} />
          {count > 0 && (
            <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
              {toPersianDigits(count > 99 ? "٩٩+" : count)}
            </span>
          )}
        </button>
      </RadixDropdownMenu.Trigger>
      <RadixDropdownMenu.Portal>
        <RadixDropdownMenu.Content
          align="end"
          sideOffset={10}
          className="z-50 w-80 overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-900 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
        >
          <div className="flex items-center justify-between border-b border-neutral-100 p-3 dark:border-neutral-800">
            <span className="text-sm font-semibold">یادآوری‌ها</span>
            {notificationsSupported && permission !== "granted" && (
              <button
                type="button"
                onClick={() => Notification.requestPermission()}
                className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                فعال‌سازی نوتیف
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {count === 0 && <p className="p-4 text-center text-sm text-neutral-500">یادآوری فعالی وجود ندارد.</p>}
            {(reminders ?? []).map((r) => (
              <div
                key={reminderKey(r)}
                className="flex items-center justify-between gap-2 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-neutral-800/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <p
                    className={cn(
                      "text-xs",
                      r.daysUntilDue < 0
                        ? "text-red-600 dark:text-red-400"
                        : r.daysUntilDue === 0
                          ? "font-semibold text-amber-600 dark:text-amber-400"
                          : "text-neutral-500 dark:text-neutral-400",
                    )}
                  >
                    {dueLabel(r.daysUntilDue)}
                  </p>
                </div>
                <p className="shrink-0 text-xs font-semibold">{formatRial(r.amount)}</p>
              </div>
            ))}
          </div>
        </RadixDropdownMenu.Content>
      </RadixDropdownMenu.Portal>
    </RadixDropdownMenu.Root>
  );
}
