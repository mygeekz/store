import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import TelegramTopicPanel from '../components/TelegramTopicPanel';
import ReportSchedulePanel from '../components/ReportSchedulePanel';
import { exportReportToXlsx } from '../utils/reportXlsx';
// پرینت مستقیم بدون route چاپ
import { printArea } from '../utils/printArea';
// استفاده از helper برای چاپ مستقیم بدون رفتن به مسیر /print (پیشگیری از صفحه سفید)
import { openReportPrintWindow } from '../utils/reportPrint';
import { useAuth } from '../contexts/AuthContext';
import { getAuthHeaders } from '../utils/apiUtils';
import { ReportsExportsProvider } from '../contexts/ReportsExportsContext';

type ModalKind = null | 'telegram' | 'schedule' | 'views' | 'send';

type ExportHandlers = {
  excel?: () => void | Promise<void>;
  pdf?: () => void | Promise<void>;
  print?: () => void | Promise<void>;
};

// Action buttons: force readable colors regardless of inherited styles.
const BTN =
  "report-action-btn inline-flex items-center gap-2 h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition active:scale-[0.99] dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800 dark:hover:bg-slate-800";
const BTN_GHOST =
  "report-action-btn inline-flex items-center gap-2 h-10 px-3 rounded-xl border border-transparent bg-transparent text-slate-800 text-sm font-semibold hover:bg-slate-100 transition active:scale-[0.99] dark:text-slate-100 dark:hover:bg-white/10";
const BTN_PRIMARY =
  "report-action-btn inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 active:scale-[0.99] transition shadow-sm dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200";

const PILL_GROUP =
  "inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur px-1.5 py-1 shadow-sm dark:bg-slate-900/60 dark:border-slate-800";

function PremiumModal({
  open,
  title,
  subtitle,
  icon,
  onClose,
  primaryLabel = "ذخیره",
  onPrimary,
  children,
  maxWidthClass = "max-w-5xl",
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClose: () => void;
  primaryLabel?: string;
  onPrimary?: () => void;
  children: React.ReactNode;
  maxWidthClass?: string;
}) {
  if (!open) return null;

  // مهم: چون بعضی از کانتینرها در اپ transform دارند (Framer Motion/Layouts)،
  // position:fixed ممکن است نسبت به همان کانتینر محاسبه شود و پنجره جابجا باز شود.
  // برای اینکه همیشه وسط viewport باشد، مودال را به document.body پورتال می‌کنیم.
  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-6" dir="rtl" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.985 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className={[
          "w-full",
          maxWidthClass,
          "relative z-10",
          "rounded-2xl overflow-hidden",
          // NOTE: از رنگ‌های صریح استفاده می‌کنیم تا پنجره "مات/طوسی" نشود.
          "bg-white text-gray-900 border border-gray-200 shadow-2xl",
          "dark:bg-slate-900 dark:text-gray-100 dark:border-slate-800",
        ].join(" ")}
      >
        {/* Accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm grid place-items-center dark:bg-slate-900 dark:ring-slate-800">
                  {icon ?? <span className="text-lg">⚙️</span>}
                </div>
                <div className="min-w-0">
                  <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 truncate">
                    {title}
                  </div>
                  {subtitle ? (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      {subtitle}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 rounded-xl hover:bg-gray-100 grid place-items-center text-gray-700 transition dark:hover:bg-white/10 dark:text-gray-200"
              aria-label="بستن"
              title="بستن"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[70vh] overflow-auto">
          <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4 min-w-0 overflow-x-auto dark:border-slate-800 dark:bg-slate-900/40">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 bg-white sticky bottom-0 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
<div className="flex items-center gap-2 justify-end">
              <button type="button" className={BTN_GHOST} onClick={onClose}>
                انصراف
              </button>
              <button
                type="button"
                className={BTN_PRIMARY}
                onClick={() => (onPrimary ? onPrimary() : onClose())}
              >
                {primaryLabel}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

type ReportMeta = {
  path: string; // absolute
  title: string;
  description: string;
};

// Keep this list in-sync with App.tsx report routes.
const REPORT_META: ReportMeta[] = [
  { path: '/reports', title: 'گزارشات', description: 'داشبورد گزارش‌ها و تحلیل‌ها' },
  { path: '/reports/sales-summary', title: 'گزارش فروش و سود', description: 'روند فروش، پرفروش‌ها و سود ناخالص در بازه' },
  { path: '/reports/product-sales', title: 'فروش محصولات (بدون گوشی)', description: 'جمع و جزئیات فروش کالاهای انبار با خروجی' },
  { path: '/reports/followups', title: 'پیگیری‌ها', description: 'لیست پیگیری‌ها و وضعیت انجام' },
  { path: '/reports/debtors', title: 'گزارش بدهکاران', description: 'لیست بدهکاران مشتری با مرتب‌سازی و جستجو' },
  { path: '/reports/creditors', title: 'گزارش بستانکاران', description: 'لیست بستانکاران تامین‌کننده/همکار' },
  { path: '/reports/top-customers', title: 'مشتریان برتر', description: 'Top مشتریان در بازه انتخابی' },
  { path: '/reports/top-suppliers', title: 'تامین‌کنندگان برتر', description: 'Top تامین‌کنندگان در بازه انتخابی' },
  { path: '/reports/phone-sales', title: 'فروش موبایل (نقدی)', description: 'سود هر فروش موبایل، IMEI، مشتری و تاریخ' },
  { path: '/reports/phone-installment-sales', title: 'فروش اقساطی موبایل', description: 'سود فروش‌های اقساطی موبایل در بازه' },
  { path: '/reports/periodic-comparison', title: 'مقایسه‌ای فروش', description: 'مقایسه دوره انتخابی با دوره قبل/سال قبل' },
  { path: '/reports/financial-overview', title: 'نمای کلی مالی', description: 'KPIهای مالی، مانده‌ها و گردش نقدی' },
  { path: '/reports/analytics', title: 'داشبورد تحلیلی', description: 'روندها، مقایسه ماه‌ها و تحلیل محصولات' },
  { path: '/reports/product-profit-real', title: 'سود واقعی هر محصول', description: 'سود/زیان واقعی (FIFO) و سهم از درآمد' },
  { path: '/reports/installments-calendar', title: 'تقویم اقساط و چک‌ها', description: 'نمایش سررسیدها در بازه انتخابی' },
  { path: '/reports/rfm', title: 'RFM', description: 'تحلیل وفاداری مشتریان' },
  { path: '/reports/cohort', title: 'Cohort', description: 'تحلیل cohort و بازگشت مشتری' },
  { path: '/reports/inventory-turnover', title: 'گردش موجودی', description: 'Inventory Turnover و Days of Inventory' },
  { path: '/reports/dead-stock', title: 'Dead Stock', description: 'کالاهای بدون حرکت و خواب سرمایه' },
  { path: '/reports/abc', title: 'ABC Analysis', description: 'طبقه‌بندی A/B/C محصولات' },
  { path: '/reports/aging-receivables', title: 'Aging Receivables', description: 'بدهی مشتریان در بازه‌های سنی' },
  { path: '/reports/cashflow', title: 'Cashflow', description: 'ورودی/خروجی نقدی و پیش‌بینی ساده' },
  { path: '/reports/analysis', title: 'تحلیل پیشرفته', description: 'Profitability، Inventory Analysis و پیشنهاد خرید' },
  { path: '/reports/analysis/profitability', title: 'Profitability', description: 'سودآوری و سهم سود در بازه' },
  { path: '/reports/analysis/inventory', title: 'Inventory Analysis', description: 'تحلیل موجودی و گردش کالا' },
  { path: '/reports/analysis/suggestions', title: 'Purchase Suggestions', description: 'پیشنهاد خرید بر اساس روند فروش' },
];

function pickMeta(pathname: string): ReportMeta {
  const exact = REPORT_META.find((m) => m.path === pathname);
  if (exact) return exact;
  const pref = REPORT_META
    .filter((m) => pathname.startsWith(m.path))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return (
    pref || {
      path: pathname,
      title: 'گزارش',
      description: 'جزئیات گزارش',
    }
  );
}

const ReportsLayout: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [modal, setModal] = useState<ModalKind>(null);
  const [savedViews, setSavedViews] = useState<any[]>([]);
  const [viewsLoading, setViewsLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [viewName, setViewName] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [sendResult, setSendResult] = useState<string>('');
  const [exportHandlers, setExportHandlers] = useState<ExportHandlers>({});
  const registerReportExports = useCallback((h: ExportHandlers) => setExportHandlers(h || {}), []);

	// یک کلید پایدار برای هر صفحه گزارش (برای ریست هندلرها هنگام تغییر مسیر)
	// ⚠️ باید قبل از useEffect تعریف شود تا خطای "Cannot access before initialization" رخ ندهد.
	const reportKey = pathname.split('/').slice(2).join('/') || 'reports';

  useEffect(() => {
    setExportHandlers({});
  }, [reportKey]);

	const meta = useMemo(() => pickMeta(pathname), [pathname]);
	const isHub = pathname === '/reports' || pathname === '/reports/';

  // ✅ روش پایدار: چاپ/PDF از مسیر جدا (Print Route)
  // این کار باعث می‌شود MainLayout/overflow/transform در چاپ دخالت نکنند و خروجی سفید نشود.
  const openPrintRoute = (mode: 'pdf' | 'print') => {
    if (isHub) return;

    // HashRouter: مسیر فعلی داخل location.hash است.
    const hash = window.location.hash || '';
    const raw = hash.startsWith('#') ? hash.slice(1) : hash;
    const [pathOnly, searchOnly = ''] = raw.split('?');
    if (!pathOnly.startsWith('/reports')) return;

    const printPath = pathOnly.replace('/reports', '/print/reports');
    const qs = new URLSearchParams(searchOnly);
    qs.set('mode', mode);

    // برای auto-print در تب جدید
    try {
      sessionStorage.setItem('KOUROSH_PRINT_MODE', mode);
    } catch {
      // ignore
    }

    const url = `${window.location.origin}${window.location.pathname}#${printPath}?${qs.toString()}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const doExportPdf = async () => {
    if (exportHandlers.pdf) {
      setPdfLoading(true);
      try {
        await exportHandlers.pdf();
      } finally {
        // کمی تأخیر برای ریست وضعیت لودینگ
        setTimeout(() => setPdfLoading(false), 300);
      }
      return;
    }
    // Fallback: از محتوی فعلی گزارش snapshot بگیر و در پنجره جدید چاپ کن.
    // این روش از Transform/Overflow layout اصلی جداست و جلوی صفحه سفید را می‌گیرد.
    try {
      openReportPrintWindow({
        title: meta.title,
        selector: '#report-print-root',
        mode: 'pdf',
        rtl: true,
      });
    } catch {
      // اگر پنجره پاپ‌آپ مسدود شد، حداقل چاپ معمولی را امتحان کن
      window.print();
    }
  };

  // Wait until report is loaded before printing. Similar to PrintLayout's waitForReportReady.
  const waitForReportReady = async (timeoutMs = 12000) => {
    const start = Date.now();
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    while (Date.now() - start < timeoutMs) {
      const root = document.getElementById('report-print-root') as HTMLElement | null;
      if (root) {
        const text = (root.innerText || '').replace(/\s+/g, ' ').trim();
        const hasLoadingText = /بارگذاری|در حال|loading|please wait/i.test(text);
        const rowCount = root.querySelectorAll('table tbody tr').length;
        const hasMeaningfulDom = root.querySelectorAll('*').length > 10;
        if (!hasLoadingText && (rowCount > 0 || text.length > 60) && hasMeaningfulDom) {
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          return;
        }
      }
      await sleep(250);
    }
  };

  const doPrint = async () => {
    if (exportHandlers.print) {
      await exportHandlers.print();
      return;
    }
    // صبر کنید تا دیتای گزارش لود شود (جدول/آمار)
    await waitForReportReady();
    // CSS اضافی: حذف transform/overflow در چاپ و پنهان کردن دکمه‌ها
    const extraCss = `
      @media print {
        * { transform: none !important; overflow: visible !important; filter: none !important; }
        button, .no-print, [data-print-hide="true"] { display: none !important; }
      }
    `;
    printArea('#report-print-root', { title: meta.title, extraCss });
  };

  const doExportXlsx = async () => {
    if (exportHandlers.excel) {
      await exportHandlers.excel();
      return;
    }
    const el = document.getElementById('report-print-root');
    if (!el) return;
    await exportReportToXlsx({ title: meta.title, element: el });
  };

  const parseRangeFromUrl = () => {
    const search = window.location.search || '';
    const sp = new URLSearchParams(search);
    const fromJ = sp.get('fromDate') || sp.get('from') || sp.get('fromJ') || '';
    const toJ = sp.get('toDate') || sp.get('to') || sp.get('toJ') || '';
    return { fromJ, toJ, search };
  };

  const loadViews = async () => {
    setViewsLoading(true);
    try {
      const res = await fetch(`/api/reports/saved-filters?reportKey=${encodeURIComponent(reportKey)}`, {
        headers: { ...(getAuthHeaders(token) as any) },
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || 'خطا در دریافت ویوهای ذخیره‌شده');
      const rows = Array.isArray(json.data) ? json.data : [];
      const mapped = rows.map((r: any) => {
        let parsed: any = {};
        try {
          parsed = r?.filtersJson ? JSON.parse(String(r.filtersJson)) : (r?.filters || {});
        } catch {
          parsed = {};
        }
        return { ...r, filtersObj: parsed };
      });
      setSavedViews(mapped);
    } catch {
      setSavedViews([]);
    } finally {
      setViewsLoading(false);
    }
  };

  useEffect(() => {
    if (!isHub) loadViews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportKey]);

  const saveView = async () => {
    const name = String(viewName || '').trim();
    if (!name) return;
    const { search } = parseRangeFromUrl();
    try {
      const res = await fetch('/api/reports/saved-filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(getAuthHeaders(token) as any) },
        body: JSON.stringify({ reportKey, name, filters: { search } }),
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || 'ذخیره ویو ناموفق بود');
      setViewName('');
      await loadViews();
    } catch {
      // silent
    }
  };

  const applyView = (row: any) => {
    const search = String(row?.filtersObj?.search || row?.filters?.search || '');
    navigate(`${pathname}${search || ''}`);
    setModal(null);
  };

  const deleteView = async (id: number) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/reports/saved-filters/${id}`, {
        method: 'DELETE',
        headers: { ...(getAuthHeaders(token) as any) },
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || 'حذف ناموفق بود');
      await loadViews();
    } catch {
      // silent
    }
  };

  const sendToTelegramNow = async () => {
    setSendLoading(true);
    setSendResult('');
    try {
      const { fromJ, toJ } = parseRangeFromUrl();
      const payloadJson = { range: { fromJ: fromJ || undefined, toJ: toJ || undefined } };
      const res = await fetch('/api/reports/send-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(getAuthHeaders(token) as any) },
        body: JSON.stringify({ reportKey, payloadJson }),
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || 'ارسال ناموفق بود');
      setSendResult(`ارسال انجام شد: موفق ${json.data?.sent ?? 0} از ${json.data?.total ?? 0}`);
    } catch (e: any) {
      setSendResult(e?.message || 'ارسال ناموفق بود');
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="rounded-2xl bg-surface border border-border/60 shadow-sm dark:shadow-none px-4 py-4 print:hidden"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 ring-1 ring-primary/15 flex items-center justify-center shrink-0">
            <i className="fa-solid fa-chart-simple text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">{meta.title}</h1>
              {!isHub && (
                <Link
                  to="/reports"
                  className="inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 transition shadow-sm"
                >
                  <i className="fa-solid fa-arrow-right" />
                  بازگشت به لیست
                </Link>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{meta.description}</p>
          </div>
          {!isHub ? (
            <div className="hidden md:flex items-center gap-3">
              {/* Left: workflow */}
              <div className={PILL_GROUP}>
                <button type="button" onClick={() => setModal('views')} className={BTN}>
                  <i className="fa-solid fa-bookmark" />
                  ویوها
                </button>
                <button type="button" onClick={() => setModal('schedule')} className={BTN}>
                  <i className="fa-solid fa-clock" />
                  زمان‌بندی
                </button>
                <button type="button" onClick={() => setModal('telegram')} className={BTN}>
                  <i className="fa-brands fa-telegram" />
                  تنظیمات تلگرام
                </button>
                <button type="button" onClick={() => setModal('send')} className={BTN_PRIMARY}>
                  <i className="fa-solid fa-paper-plane" />
                  ارسال به تلگرام
                </button>
              </div>

              {/* Right: export */}
              <div className={PILL_GROUP}>
                <button type="button" onClick={doPrint} className={BTN}>
                  <i className="fa-solid fa-print" />
                  چاپ
                </button>
                <button type="button" onClick={doExportXlsx} className={BTN}>
                  <i className="fa-solid fa-file-excel" />
                  Excel
                </button>
                <button
                  type="button"
                  onClick={doExportPdf}
                  disabled={pdfLoading}
                  className={BTN + (pdfLoading ? ' opacity-60 cursor-not-allowed' : '')}
                >
                  <i className="fa-solid fa-file-pdf" />
                  {pdfLoading ? 'درحال آماده‌سازی…' : 'خروجی PDF'}
                </button>
              </div>

              <div className="flex items-center gap-2 ms-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">آخرین بروزرسانی: لحظه‌ای</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500/70" />
              </div>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">آخرین بروزرسانی: لحظه‌ای</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500/70" />
            </div>
          )}
        </div>

        {/* Mobile actions */}
        {!isHub ? (
          <div className="mt-3 flex md:hidden flex-col gap-2">
            <div className={PILL_GROUP + ' flex-wrap'}>
              <button type="button" onClick={() => setModal('views')} className={BTN}>
                <i className="fa-solid fa-bookmark" />
                ویوها
              </button>
              <button type="button" onClick={() => setModal('schedule')} className={BTN}>
                <i className="fa-solid fa-clock" />
                زمان‌بندی
              </button>
              <button type="button" onClick={() => setModal('telegram')} className={BTN}>
                <i className="fa-brands fa-telegram" />
                تنظیمات تلگرام
              </button>
              <button type="button" onClick={() => setModal('send')} className={BTN_PRIMARY}>
                <i className="fa-solid fa-paper-plane" />
                ارسال به تلگرام
              </button>
            </div>
            <div className={PILL_GROUP + ' flex-wrap'}>
              <button type="button" onClick={doPrint} className={BTN}>
                <i className="fa-solid fa-print" />
                چاپ
              </button>
              <button type="button" onClick={doExportXlsx} className={BTN}>
                <i className="fa-solid fa-file-excel" />
                Excel
              </button>
              <button
                type="button"
                onClick={doExportPdf}
                disabled={pdfLoading}
                className={BTN + (pdfLoading ? ' opacity-60 cursor-not-allowed' : '')}
              >
                <i className="fa-solid fa-file-pdf" />
                {pdfLoading ? 'PDF…' : 'PDF'}
              </button>
            </div>
          </div>
        ) : null}
      </motion.div>

      {/* Single-column report content */}
      <div className="report-page" id="report-print-root">
        <ReportsExportsProvider value={{ registerReportExports }}>
          <Outlet context={{ registerReportExports }} />
        </ReportsExportsProvider>
      </div>

      {/* Modals */}
      {!isHub ? (
        <>
          <PremiumModal
            open={modal === 'telegram'}
            title={`تنظیمات تلگرام | ${meta.title}`}
            subtitle="قالب پیام، مقصدها، وضعیت ارسال و تنظیمات مرتبط"
            icon={<span className="text-lg">✈️</span>}
            onClose={() => setModal(null)}
            primaryLabel="ذخیره"
          >
            <TelegramTopicPanel
              topic="reports"
              title={`ارسال‌های تلگرام | ${meta.title}`}
              allowedTypes={[{ key: reportKey, label: meta.title }]}
            />
          </PremiumModal>
          <PremiumModal
            open={modal === 'schedule'}
            title={`زمان‌بندی ارسال | ${meta.title}`}
            subtitle="تعریف برنامه ارسال خودکار و مدیریت اجرای ارسال‌ها"
            icon={<span className="text-lg">⏱️</span>}
            onClose={() => setModal(null)}
            primaryLabel="ذخیره"
            maxWidthClass="max-w-4xl"
          >
            <ReportSchedulePanel reportKey={reportKey} reportTitle={meta.title} />
          </PremiumModal>

          <PremiumModal
            open={modal === 'views'}
            title={`ویوهای ذخیره‌شده | ${meta.title}`}
            subtitle="ذخیره/بارگذاری تنظیمات این گزارش (بر اساس پارامترهای URL)"
            icon={<span className="text-lg">💾</span>}
            onClose={() => setModal(null)}
            primaryLabel="ذخیره ویو"
            onPrimary={saveView}
            maxWidthClass="max-w-3xl"
          >
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                <label className="flex-1">
                  <div className="text-xs text-slate-600 dark:text-slate-300 mb-1">نام ویو</div>
                  <input
                    value={viewName}
                    onChange={(e) => setViewName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm dark:bg-slate-950 dark:border-slate-800"
                    placeholder="مثلاً: فروش ماه جاری"
                  />
                </label>
                <button type="button" className={BTN_PRIMARY} onClick={saveView}>
                  ذخیره
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                  <span>لیست ویوها</span>
                  <button type="button" className={BTN_GHOST} onClick={loadViews} disabled={viewsLoading}>
                    بروزرسانی
                  </button>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {(savedViews || []).length ? (
                    savedViews.map((v: any) => (
                      <div key={v.id} className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{v.name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{String(v.filtersObj?.search || '')}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button type="button" className={BTN} onClick={() => applyView(v)}>اعمال</button>
                          <button type="button" className={BTN_GHOST} onClick={() => deleteView(Number(v.id))}>حذف</button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-sm text-slate-500 dark:text-slate-400">ویویی ذخیره نشده است.</div>
                  )}
                </div>
              </div>
            </div>
          </PremiumModal>

          <PremiumModal
            open={modal === 'send'}
            title={`ارسال به تلگرام | ${meta.title}`}
            subtitle="همین الان این گزارش را به مقصدهای تلگرام ارسال کن (بر اساس بازه انتخابی همین صفحه)"
            icon={<span className="text-lg">✈️</span>}
            onClose={() => setModal(null)}
            primaryLabel={sendLoading ? 'در حال ارسال…' : 'ارسال'}
            onPrimary={sendToTelegramNow}
            maxWidthClass="max-w-3xl"
          >
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/40 p-3">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">نکته</div>
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  اگر Chat IDها یا توکن تنظیم نشده باشد، ارسال انجام نمی‌شود. تنظیمات را از دکمه «تنظیمات تلگرام» تکمیل کن.
                </div>
              </div>
              {sendResult ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-3 text-sm text-slate-800 dark:text-slate-200">
                  {sendResult}
                </div>
              ) : null}
            </div>
          </PremiumModal>
        </>
      ) : null}
    </div>
  );
};

export default ReportsLayout;
