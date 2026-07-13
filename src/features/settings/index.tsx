import * as React from "react";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Pencil, Download, Upload, CalendarRange, Tags, Landmark, DatabaseBackup, FolderSync } from "lucide-react";
import { listCategories, addCategory, updateCategory } from "@/db/repositories/categories";
import { listAllAccounts, updateAccount } from "@/db/repositories/accounts";
import { listJalaliYears } from "@/db/repositories/jalaliYears";
import { ensureYearsGenerated } from "@/domain/recurrence";
import { exportBackup, importBackup } from "@/domain/backup";
import { today, toPersianDigits } from "@/domain/jalali";
import { formatRial, formatNumber } from "@/lib/format";
import { cardClassName } from "@/lib/cardStyles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select";
import { AccountForm } from "@/features/settings/AccountForm";
import { YearDetailDialog } from "@/features/settings/YearDetailDialog";
import { AutoBackupSection } from "@/features/settings/AutoBackupSection";
import type { CategoryKind, Account, JalaliYearRecord } from "@/types/entities";

const KIND_OPTIONS: Array<{ value: CategoryKind; label: string }> = [
  { value: "expense", label: "هزینه" },
  { value: "income", label: "درآمد" },
  { value: "both", label: "هردو" },
];

const ACCOUNT_TYPE_LABELS: Record<Account["type"], string> = {
  cash: "نقدی",
  bank: "بانکی",
  other: "سایر",
};

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof CalendarRange;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn(cardClassName, "space-y-4 p-5")}>
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
          <Icon size={16} />
        </span>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function SettingsPage() {
  const categories = useLiveQuery(() => listCategories(), [], []);
  const accounts = useLiveQuery(() => listAllAccounts(), [], []);
  const years = useLiveQuery(() => listJalaliYears(), [], []);

  const [categoryName, setCategoryName] = useState("");
  const [categoryKind, setCategoryKind] = useState<CategoryKind>("expense");

  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined);
  const [detailYear, setDetailYear] = useState<JalaliYearRecord | undefined>(undefined);

  const [isRolling, setIsRolling] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nextYear = useMemo(() => {
    const maxYear = (years ?? []).reduce((max, y) => Math.max(max, y.year), today().year);
    return maxYear + 1;
  }, [years]);

  const handleAddCategory = async () => {
    if (!categoryName.trim()) return;
    await addCategory(categoryName.trim(), categoryKind);
    setCategoryName("");
  };

  const openCreateAccount = () => {
    setEditingAccount(undefined);
    setAccountFormOpen(true);
  };

  const openEditAccount = (account: Account) => {
    setEditingAccount(account);
    setAccountFormOpen(true);
  };

  const handleRollToNewYear = async () => {
    setIsRolling(true);
    try {
      await ensureYearsGenerated([nextYear]);
    } finally {
      setIsRolling(false);
    }
  };

  const handleExport = async () => {
    await exportBackup();
    setBackupMessage("فایل پشتیبان با موفقیت دانلود شد.");
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (
      !confirm(
        "بازیابی از فایل پشتیبان تمام داده‌های فعلی را جایگزین می‌کند و غیرقابل بازگشت است. ادامه می‌دهید؟",
      )
    ) {
      return;
    }
    try {
      const summary = await importBackup(file);
      const total = Object.values(summary).reduce((sum, n) => sum + n, 0);
      setBackupMessage(`بازیابی با موفقیت انجام شد (${total} رکورد بازیابی شد).`);
    } catch {
      setBackupMessage("فایل پشتیبان نامعتبر است.");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">تنظیمات</h2>

      <SectionCard icon={CalendarRange} title="مدیریت سال مالی">
        <div className="overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400">
              <tr>
                <th className="p-3 text-start">سال</th>
                <th className="p-3 text-start">وضعیت</th>
                <th className="p-3 text-start">آخرین ماه تولیدشده</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {(years ?? []).map((y) => (
                <tr
                  key={y.year}
                  className="border-t border-neutral-100 transition-colors hover:bg-slate-50/70 dark:border-neutral-800 dark:hover:bg-neutral-800/40"
                >
                  <td className="p-3 font-medium">{toPersianDigits(y.year)}</td>
                  <td className="p-3">{y.isActive ? "فعال" : "غیرفعال"}</td>
                  <td className="p-3">
                    {y.occurrencesGeneratedThrough ? formatNumber(y.occurrencesGeneratedThrough) : "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setDetailYear(y)}>
                        جزئیات و مدیریت
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {years && years.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-neutral-500">
                    هنوز سال مالی‌ای ثبت نشده است.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Button onClick={handleRollToNewYear} disabled={isRolling}>
          <Plus size={16} />
          شروع سال {toPersianDigits(nextYear)}
        </Button>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          آیتم‌های تکرارشونده فعال به‌طور خودکار برای سال جدید تولید می‌شوند؛ نیازی به ورود دستی مجدد نیست. برای
          حذف یک سال مالی و همه سررسیدهای آن، روی «جزئیات و مدیریت» بزنید.
        </p>
      </SectionCard>

      <SectionCard icon={Tags} title="دسته‌بندی‌ها">
        <div className="overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400">
              <tr>
                <th className="p-3 text-start">نام</th>
                <th className="p-3 text-start">نوع</th>
                <th className="p-3 text-start">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {(categories ?? []).map((c) => (
                <tr key={c.id} className="border-t border-neutral-100 transition-colors hover:bg-slate-50/70 dark:border-neutral-800 dark:hover:bg-neutral-800/40">
                  <td className="p-3 font-medium">{c.nameFa}</td>
                  <td className="p-3 text-neutral-500 dark:text-neutral-400">
                    {KIND_OPTIONS.find((k) => k.value === c.kind)?.label}
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => updateCategory(c.id, { isArchived: !c.isArchived })}
                      className="text-xs text-neutral-500 hover:text-red-600 dark:text-neutral-400"
                    >
                      {c.isArchived ? "غیرفعال" : "حذف"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2">
          <Input
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="نام دسته‌بندی جدید"
            className="max-w-56"
          />
          <div className="w-36">
            <SelectField value={categoryKind} onChange={(v) => setCategoryKind(v as CategoryKind)} options={KIND_OPTIONS} />
          </div>
          <Button variant="secondary" onClick={handleAddCategory}>
            <Plus size={16} />
            افزودن
          </Button>
        </div>
      </SectionCard>

      <SectionCard icon={Landmark} title="حساب‌ها">
        <div className="flex justify-end">
          <Button onClick={openCreateAccount}>
            <Plus size={16} />
            افزودن حساب جدید
          </Button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400">
              <tr>
                <th className="p-3 text-start">نام</th>
                <th className="p-3 text-start">نوع</th>
                <th className="p-3 text-start">شماره کارت</th>
                <th className="p-3 text-start">موجودی اولیه</th>
                <th className="p-3 text-start">وضعیت</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {(accounts ?? []).map((a) => (
                <tr key={a.id} className="border-t border-neutral-100 transition-colors hover:bg-slate-50/70 dark:border-neutral-800 dark:hover:bg-neutral-800/40">
                  <td className="p-3 font-medium">
                    {a.name}
                    {a.bankName && (
                      <span className="mr-1 text-neutral-500 dark:text-neutral-400"> · {a.bankName}</span>
                    )}
                  </td>
                  <td className="p-3 text-neutral-500 dark:text-neutral-400">{ACCOUNT_TYPE_LABELS[a.type]}</td>
                  <td dir="ltr" className="p-3 text-start text-neutral-500 dark:text-neutral-400">
                    {a.cardNumber || "—"}
                  </td>
                  <td className="p-3">{formatRial(a.initialBalance)}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => updateAccount(a.id, { isArchived: !a.isArchived })}
                      className={
                        a.isArchived
                          ? "rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800"
                          : "rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      }
                    >
                      {a.isArchived ? "غیرفعال" : "فعال"}
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openEditAccount(a)} aria-label="ویرایش">
                        <Pencil size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {accounts && accounts.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-neutral-500">
                    هنوز حسابی ثبت نشده است.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard icon={FolderSync} title="بکاپ خودکار">
        <AutoBackupSection />
      </SectionCard>

      <SectionCard icon={DatabaseBackup} title="پشتیبان‌گیری و بازیابی">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          چون همه‌چیز فقط روی همین مرورگر ذخیره می‌شود، برای جلوگیری از از دست رفتن اطلاعات به‌طور دوره‌ای
          یک فایل پشتیبان JSON دانلود کنید.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleExport}>
            <Download size={16} />
            دانلود فایل پشتیبان
          </Button>
          <Button variant="secondary" onClick={handleImportClick}>
            <Upload size={16} />
            بازیابی از فایل پشتیبان
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
        {backupMessage && <p className="text-sm text-blue-700 dark:text-blue-400">{backupMessage}</p>}
      </SectionCard>

      <AccountForm
        open={accountFormOpen}
        onOpenChange={setAccountFormOpen}
        account={editingAccount}
        onSaved={() => setAccountFormOpen(false)}
      />

      {detailYear && <YearDetailDialog year={detailYear} onClose={() => setDetailYear(undefined)} />}
    </div>
  );
}
