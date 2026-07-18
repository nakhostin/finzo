import { NavLink, Outlet } from "react-router";
import {
  LayoutDashboard,
  ListChecks,
  Repeat,
  Landmark,
  Users,
  Coins,
  ShoppingCart,
  Car,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";

function AppLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="app-logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="0.55" stopColor="#2563eb" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="512" height="512" rx="118" fill="url(#app-logo-bg)" />
      <polyline
        points="126,352 214,286 296,320 386,180"
        fill="none"
        stroke="#ffffff"
        strokeWidth="26"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="322,176 386,176 386,240"
        fill="none"
        stroke="#ffffff"
        strokeWidth="26"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="126" cy="352" r="20" fill="#ffffff" />
      <circle cx="214" cy="286" r="20" fill="#bfdbfe" />
      <circle cx="296" cy="320" r="20" fill="#bfdbfe" />
    </svg>
  );
}

const NAV_ITEMS: Array<{
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}> = [
  { to: "/", label: "داشبورد", icon: LayoutDashboard, end: true },
  { to: "/checklist", label: "چک‌لیست ماه", icon: ListChecks },
  { to: "/recurring", label: "مدیریت آیتم‌ها", icon: Repeat },
  { to: "/cheques", label: "چک‌ها", icon: Landmark },
  { to: "/people", label: "اشخاص", icon: Users },
  { to: "/assets", label: "دارایی‌ها", icon: Coins },
  { to: "/shopping", label: "لیست خرید", icon: ShoppingCart },
  { to: "/vehicle", label: "خودرو", icon: Car },
  { to: "/reports", label: "گزارش‌ها", icon: BarChart3 },
  { to: "/settings", label: "تنظیمات", icon: Settings },
];

export function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-slate-900 p-4">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <AppLogo className="size-9 shrink-0 rounded-xl shadow-lg shadow-blue-900/40" />
          <div className="flex-1 leading-tight">
            <h1 className="text-base font-bold text-white">فینزو</h1>
            <p className="text-[11px] text-slate-400">مدیریت مالی شخصی</p>
          </div>
          <NotificationBell />
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="px-2 text-xs text-slate-500">نسخه آفلاین · تمام داده‌ها روی همین دستگاه</p>
      </aside>
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
