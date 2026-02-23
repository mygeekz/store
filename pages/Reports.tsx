import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

type CategoryId = 'financial' | 'sales' | 'customers' | 'inventory' | 'analysis';

type CategoryMeta = {
  id: CategoryId;
  title: string;
  description: string;
};

// Lightweight inline icons (no external deps)
const I = {
  Chart: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
      <path d="M4 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 19H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 16V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 16V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Trend: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
      <path
        d="M4 16l6-6 4 4 6-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 6v6h-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Users: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
      <path d="M16 11a4 4 0 10-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 20c1.5-4 14.5-4 16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Box: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
      <path d="M3 7l9-4 9 4-9 4-9-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M3 7v10l9 4 9-4V7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 11v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Wallet: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
      <path d="M3 7h18v10H3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M17 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Calendar: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
      <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 8h16v13H4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  Doc: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
      <path d="M7 3h7l3 3v15H7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 11h6M9 15h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Layers: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
      <path
        d="M12 3l9 6-9 6-9-6 9-6z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M3 15l9 6 9-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Sparkle: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
      <path
        d="M12 2l1.2 4.5L18 8l-4.8 1.5L12 14l-1.2-4.5L6 8l4.8-1.5L12 2z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M20 12l.8 3L24 16l-3.2 1-.8 3-.8-3L16 16l3.2-1 .8-3z" stroke="currentColor" strokeWidth="0" />
    </svg>
  ),
  Search: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
      <path d="M10.5 18a7.5 7.5 0 117.5-7.5A7.5 7.5 0 0110.5 18z" stroke="currentColor" strokeWidth="2" />
      <path d="M16.3 16.3L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  ChevronLeft: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const CATEGORIES: CategoryMeta[] = [
  { id: 'financial', title: 'مالی', description: 'نمای کلی مالی، نقدینگی، بدهکار/بستانکار' },
  { id: 'sales', title: 'فروش', description: 'فروش و سود، مقایسه دوره‌ای، فروش موبایل' },
  { id: 'customers', title: 'مشتریان', description: 'مشتریان برتر، RFM، Cohort و وصول مطالبات' },
  { id: 'inventory', title: 'انبار', description: 'گردش موجودی، خواب سرمایه و تحلیل موجودی' },
  { id: 'analysis', title: 'تحلیل پیشرفته', description: 'تحلیل‌های ترکیبی و پیشنهاد خرید' },
];

const CATEGORY_ICON_MAP: Record<CategoryId, React.ElementType> = {
  financial: I.Chart,
  sales: I.Trend,
  customers: I.Users,
  inventory: I.Box,
  analysis: I.Sparkle,
};

const REPORT_ICON_MAP: Record<string, React.ElementType> = {
  'financial-overview': I.Chart,
  cashflow: I.Wallet,
  debtors: I.Users,
  creditors: I.Users,
  'inventory-turnover': I.Box,
  rfm: I.Users,
  'sales-report': I.Trend,
  'compare-sales': I.Layers,
  'product-sales-no-mobile': I.Doc,
  'installments-checks-calendar': I.Calendar,

  // current routes in this project
  'installments-calendar': I.Calendar,
  'sales-summary': I.Trend,
  'product-sales': I.Doc,
  'periodic-comparison': I.Layers,
  'phone-sales': I.Trend,
  'phone-installment-sales': I.Trend,
  'top-customers': I.Users,
  'aging-receivables': I.Users,
  cohort: I.Users,
  followups: I.Users,
  'dead-stock': I.Box,
  abc: I.Box,
  'top-suppliers': I.Users,
  'analysis-hub': I.Sparkle,
  'product-profit-real': I.Trend,
  analytics: I.Chart,
};

type ReportCard = {
  id: string;
  title: string;
  description: string;
  to: string;
  category: CategoryId;
  tags?: string[];
  highlight?: boolean;
};

// IMPORTANT: only include routes that exist in App.tsx
const REPORTS: ReportCard[] = [
  { id: 'financial-overview', title: 'نمای کلی مالی', description: 'KPIهای مالی، مانده‌ها و گردش نقدی', to: '/reports/financial-overview', category: 'financial', tags: ['KPI', 'نقدینگی'], highlight: true },
  { id: 'cashflow', title: 'Cashflow', description: 'ورودی/خروجی نقدی و پیش‌بینی ساده', to: '/reports/cashflow', category: 'financial', tags: ['Forecast'] },
  { id: 'debtors', title: 'بدهکاران', description: 'لیست بدهکاران مشتری با جستجو و مرتب‌سازی', to: '/reports/debtors', category: 'financial', tags: ['وصول'] },
  { id: 'creditors', title: 'بستانکاران', description: 'لیست بستانکاران تامین‌کننده/همکار', to: '/reports/creditors', category: 'financial', tags: ['پرداخت'] },
  { id: 'installments-calendar', title: 'تقویم اقساط و چک‌ها', description: 'نمایش سررسیدها در بازه انتخابی', to: '/reports/installments-calendar', category: 'financial', tags: ['اقساط', 'چک'] },

  { id: 'sales-summary', title: 'گزارش فروش و سود', description: 'روند فروش، پرفروش‌ها و سود ناخالص', to: '/reports/sales-summary', category: 'sales', tags: ['روزانه', 'سود'], highlight: true },
  { id: 'product-sales', title: 'فروش محصولات (بدون گوشی)', description: 'جمع و جزئیات فروش کالاهای انبار', to: '/reports/product-sales', category: 'sales', tags: ['Excel'] },
  { id: 'periodic-comparison', title: 'مقایسه‌ای فروش', description: 'مقایسه دوره انتخابی با دوره قبل/سال قبل', to: '/reports/periodic-comparison', category: 'sales', tags: ['رشد'] },
  { id: 'phone-sales', title: 'فروش موبایل (نقدی)', description: 'سود هر فروش موبایل، IMEI، مشتری و تاریخ', to: '/reports/phone-sales', category: 'sales', tags: ['IMEI'] },
  { id: 'phone-installment-sales', title: 'فروش اقساطی موبایل', description: 'سود فروش‌های اقساطی موبایل در بازه', to: '/reports/phone-installment-sales', category: 'sales', tags: ['اقساط'] },

  { id: 'top-customers', title: 'مشتریان برتر', description: 'Top مشتریان در بازه انتخابی', to: '/reports/top-customers', category: 'customers', tags: ['Top'] },
  { id: 'aging-receivables', title: 'Aging Receivables', description: 'بدهی مشتریان در بازه‌های سنی', to: '/reports/aging-receivables', category: 'customers', tags: ['ریسک'] },
  { id: 'rfm', title: 'RFM', description: 'تحلیل وفاداری مشتریان', to: '/reports/rfm', category: 'customers', tags: ['تحلیل'], highlight: true },
  { id: 'cohort', title: 'Cohort', description: 'تحلیل cohort و بازگشت مشتری', to: '/reports/cohort', category: 'customers', tags: ['Retention'] },
  { id: 'followups', title: 'پیگیری‌ها', description: 'لیست پیگیری‌ها و وضعیت انجام', to: '/reports/followups', category: 'customers', tags: ['CRM'] },

  { id: 'inventory-turnover', title: 'گردش موجودی', description: 'Inventory Turnover و Days of Inventory', to: '/reports/inventory-turnover', category: 'inventory', tags: ['KPI'], highlight: true },
  { id: 'dead-stock', title: 'Dead Stock', description: 'کالاهای بدون حرکت و خواب سرمایه', to: '/reports/dead-stock', category: 'inventory', tags: ['ریسک'] },
  { id: 'abc', title: 'ABC Analysis', description: 'طبقه‌بندی A/B/C محصولات', to: '/reports/abc', category: 'inventory', tags: ['ABC'] },
  { id: 'top-suppliers', title: 'تامین‌کنندگان برتر', description: 'Top تامین‌کنندگان در بازه انتخابی', to: '/reports/top-suppliers', category: 'inventory', tags: ['Top'] },

  { id: 'analysis-hub', title: 'تحلیل پیشرفته', description: 'Profitability، Inventory Analysis و پیشنهاد خرید', to: '/reports/analysis', category: 'analysis', tags: ['Advanced'] },
  { id: 'product-profit-real', title: 'سود واقعی هر محصول', description: 'سود/زیان واقعی (FIFO) و سهم از درآمد', to: '/reports/product-profit-real', category: 'analysis', tags: ['FIFO'] },
  { id: 'analytics', title: 'داشبورد تحلیلی', description: 'روندها، مقایسه ماه‌ها و تحلیل محصولات', to: '/reports/analytics', category: 'analysis', tags: ['Charts'] },
];

const Reports: React.FC = () => {
  const [activeCat, setActiveCat] = useState<CategoryId>('financial');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return REPORTS.filter((r) => {
      if (r.category !== activeCat) return false;
      if (!query) return true;
      return (
        r.title.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        (r.tags || []).some((t) => t.toLowerCase().includes(query))
      );
    });
  }, [activeCat, q]);

  const featured = useMemo(() => REPORTS.filter((r) => r.highlight).slice(0, 4), []);

  return (
    <div className="space-y-4">
      {/* Top featured */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {featured.map((r) => {
          const Icon = REPORT_ICON_MAP[r.id] || I.Sparkle;
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="rounded-2xl bg-surface border border-border/60 shadow-sm dark:shadow-none p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 ring-1 ring-primary/15 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-text truncate">{r.title}</div>
                  <div className="mt-1 text-xs text-muted line-clamp-2">{r.description}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-1 flex-wrap">
                  {(r.tags || []).slice(0, 2).map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-200"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <Link to={r.to} className="text-xs font-semibold text-primary hover:opacity-80 transition">
                  مشاهده
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Category switch + search */}
      <div className="rounded-2xl bg-surface border border-border/60 shadow-sm dark:shadow-none p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICON_MAP[c.id] || I.Chart;
              const active = activeCat === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={
                    active
                      ? 'px-3 py-2 rounded-xl bg-primary/10 ring-1 ring-primary/15 text-text text-sm font-semibold'
                      : 'px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 ring-1 ring-transparent hover:ring-border/60 text-gray-700 dark:text-gray-200 text-sm transition'
                  }
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${active ? 'text-primary' : 'text-gray-500 dark:text-gray-300'}`} />
                    {c.title}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-[360px]">
            <I.Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجو در گزارش‌ها…"
              className="w-full rounded-xl bg-gray-50 dark:bg-white/5 border border-border/60 px-10 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.25)]"
            />
          </div>
        </div>
        <div className="mt-2 text-xs text-muted">{CATEGORIES.find((c) => c.id === activeCat)?.description}</div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((r) => {
          const Icon = REPORT_ICON_MAP[r.id] || I.Doc;
          return (
            <Link
              key={r.id}
              to={r.to}
              className="group rounded-2xl bg-surface border border-border/60 shadow-sm dark:shadow-none p-4 hover:ring-1 hover:ring-primary/15 transition"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-white/5 ring-1 ring-border/40 flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:ring-primary/15 transition">
                  <Icon className="h-5 w-5 text-gray-700 dark:text-gray-200 group-hover:text-primary transition" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-text truncate">{r.title}</div>
                    <I.ChevronLeft className="h-4 w-4 text-muted opacity-0 group-hover:opacity-100 transition" />
                  </div>
                  <div className="mt-1 text-xs text-muted line-clamp-2">{r.description}</div>
                </div>
              </div>
              {r.tags?.length ? (
                <div className="mt-3 flex flex-wrap gap-1">
                  {r.tags.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-200"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Reports;
