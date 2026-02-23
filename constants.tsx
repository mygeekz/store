// constantsData.ts
import { NavItem, ChartTimeframe, PhoneStatus, RepairStatus } from './types';

/* -----------------------------------------------
   آیتم‌های منوی کنار
   (بدون تغییر نسبت به قبل تا با type فعلی سازگار بماند)
------------------------------------------------- */
export const SIDEBAR_ITEMS: NavItem[] = [
  // ✅ هسته اصلی
  { id: 'dashboard', name: 'داشبورد', icon: 'fa-solid fa-chart-line', path: '/' },

  // ✅ فروش
  {
    id: 'sales',
    name: 'فروش',
    icon: 'fa-solid fa-cart-shopping',
    path: '/sales',
    children: [
      { id: 'sales-cash', name: 'فروش نقدی', icon: 'fa-solid fa-money-bill-wave', path: '/sales/cash' },
      { id: 'installment-sales', name: 'فروش اقساطی', icon: 'fa-solid fa-file-invoice-dollar', path: '/installment-sales' },
      { id: 'invoices', name: 'فاکتورها', icon: 'fa-solid fa-file-invoice', path: '/invoices' },
    ],
  },

  // ✅ کالا و انبار
  {
    id: 'products-group',
    name: 'کالا و انبار',
    icon: 'fa-solid fa-boxes-stacked',
    path: '/products',
    children: [
      { id: 'products', name: 'کالاها', icon: 'fa-solid fa-cube', path: '/products' },
      { id: 'mobile-phones', name: 'گوشی‌های موبایل', icon: 'fa-solid fa-mobile-screen-button', path: '/mobile-phones' },
    ],
  },

  // ✅ اشخاص
  {
    id: 'people',
    name: 'اشخاص',
    icon: 'fa-solid fa-users',
    path: '/customers',
    children: [
      { id: 'customers', name: 'مشتریان', icon: 'fa-solid fa-user-group', path: '/customers' },
      { id: 'partners', name: 'همکاران', icon: 'fa-solid fa-building', path: '/partners' },
    ],
  },

  // ✅ پیام‌رسانی (از تنظیمات جدا شد تا شفاف و حرفه‌ای باشد)
  {
    id: 'messaging',
    name: 'پیام‌رسانی',
    icon: 'fa-solid fa-paper-plane',
    path: '/notifications',
    children: [
      { id: 'notifications', name: 'نوتیفیکیشن‌ها', icon: 'fa-solid fa-bell', path: '/notifications' },
      { id: 'outbox', name: 'صف ارسال', icon: 'fa-solid fa-inbox', path: '/outbox' },
    ],
  },

  // ✅ گزارش‌ها
  {
    id: 'reports',
    name: 'گزارشات',
    icon: 'fa-solid fa-chart-pie',
    path: '/reports',
    children: [
      { id: 'reports-home', name: 'داشبورد گزارشات', icon: 'fa-solid fa-chart-column', path: '/reports' },
      { id: 'financial-overview', name: 'نمای کلی مالی', icon: 'fa-solid fa-sack-dollar', path: '/reports/financial-overview' },
      { id: 'installments-calendar', name: 'تقویم اقساط و چک‌ها', icon: 'fa-solid fa-calendar-days', path: '/reports/installments-calendar' },
            { id: 'smart-analysis', name: 'تحلیل هوشمند', icon: 'fa-solid fa-brain', path: '/reports/analysis' },
      { id: 'analysis-profitability', name: 'سودآوری کالاها', icon: 'fa-solid fa-sack-dollar', path: '/reports/analysis/profitability' },
      { id: 'analysis-inventory', name: 'تحلیل وضعیت انبار', icon: 'fa-solid fa-boxes-stacked', path: '/reports/analysis/inventory' },
      { id: 'analysis-suggestions', name: 'پیشنهادهای خرید', icon: 'fa-solid fa-lightbulb', path: '/reports/analysis/suggestions' },
      { id: 'report-phone-sales', name: 'فروش نقدی موبایل', icon: 'fa-solid fa-cash-register', path: '/reports/phone-sales' },
      { id: 'report-phone-installment-sales', name: 'فروش اقساطی موبایل', icon: 'fa-solid fa-file-invoice-dollar', path: '/reports/phone-installment-sales' },
    ],
  },

  // ✅ تنظیمات (فقط تنظیمات واقعی)
  {
    id: 'settings',
    name: 'تنظیمات',
    icon: 'fa-solid fa-gear',
    path: '/settings',
    children: [
      { id: 'settings-style', name: 'ظاهر و استایل', icon: 'fa-solid fa-palette', path: '/settings/style' },
      { id: 'audit-log', name: 'گزارش فعالیت‌ها', icon: 'fa-solid fa-clipboard-list', path: '/audit-log', roles: ['Admin','Manager'] },
    ],
  },
];

/* -----------------------------------------------
   تم‌های رنگی گرادیانی برای آیکون‌های سایدبار
   (از این‌ها در کامپوننت سایدبار استفاده کن)
------------------------------------------------- */
export type SidebarAccent = 'indigo' | 'purple' | 'emerald' | 'blue' | 'orange' | 'rose';

export const ACCENT_STYLES: Record<
  SidebarAccent,
  { gradient: string; dot: string; shadow: string }
> = {
  indigo:  { gradient: 'from-indigo-500 to-violet-500',  dot: 'bg-indigo-400',  shadow: 'shadow-indigo-500/30' },
  purple:  { gradient: 'from-fuchsia-500 to-purple-500', dot: 'bg-fuchsia-400', shadow: 'shadow-fuchsia-500/30' },
  emerald: { gradient: 'from-emerald-500 to-teal-500',   dot: 'bg-emerald-400', shadow: 'shadow-emerald-500/30' },
  blue:    { gradient: 'from-sky-500 to-blue-600',       dot: 'bg-sky-400',     shadow: 'shadow-sky-500/30' },
  orange:  { gradient: 'from-orange-500 to-amber-500',   dot: 'bg-amber-400',   shadow: 'shadow-amber-500/30' },
  rose:    { gradient: 'from-rose-500 to-pink-500',      dot: 'bg-rose-400',    shadow: 'shadow-rose-500/30' },
};

/** مپ کردن هر آیتم منو به یک تم رنگی */
export const SIDEBAR_ACCENTS: Record<string, SidebarAccent> = {
  'dashboard':         'indigo',
  'products':          'blue',
  'mobile-phones':     'emerald',
  'repairs':           'orange',
  'services':          'purple',
  'sales':             'rose',
  'installment-sales': 'indigo',
  'customers':         'blue',
  'partners':          'emerald',
  'reports':           'purple',
  'financial-overview':'emerald',
  'installments-calendar':'blue',
  'smart-analysis':    'indigo',
  'invoices':          'orange',
  'notifications':     'rose',
  'settings':          'rose',
};

/* -----------------------------------------------
   کلاس‌های کمکی برای رنگی/انیمیشنی کردن آیکون
   (در JSX: این‌ها را به i.fa-* اضافه کن)
------------------------------------------------- */
export const ICON_GRADIENT_TEXT_CLASS =
  'bg-clip-text text-transparent bg-gradient-to-br';

export const ICON_HOVER_ANIM_CLASS =
  // scale / rotate فقط وقتی motion-safe فعال است
  'transition-transform duration-200 motion-safe:hover:scale-110 motion-safe:hover:rotate-[2deg]';

/* -----------------------------------------------
   سایر ثابت‌ها (بدون تغییر)
------------------------------------------------- */
export const CHART_TIMEFRAMES: ChartTimeframe[] = [
  { key: 'weekly', label: 'هفتگی' },
  { key: 'monthly', label: 'ماهانه' },
  { key: 'yearly', label: 'سالانه' },
];

export const PARTNER_TYPES = [
  { value: 'Supplier',          label: 'تامین‌کننده' },
  { value: 'Service Provider',  label: 'ارائه‌دهنده خدمات' },
  { value: 'Technician',        label: 'تعمیرکار' },
  { value: 'Other',             label: 'سایر' },
];

export const PHONE_RAM_OPTIONS = ['1 GB', '2 GB', '3 GB', '4 GB', '6 GB', '8 GB', '12 GB', '16 GB'];
export const PHONE_STORAGE_OPTIONS = ['64 GB', '128 GB', '256 GB', '512 GB', '1 TB'];
export const PHONE_CONDITIONS = ['نو (آکبند)', 'در حد نو', 'کارکرده', 'معیوب'];
// وضعیت‌های مجاز برای گوشی‌ها. «مرجوعی اقساطی» نشان‌دهندهٔ بازگشت گوشی از فروش اقساطی است و پس از این تغییر،
// کاربر باید بتواند گوشی را مجدداً بفروشد. لذا این مقدار نیز در این آرایه لحاظ می‌شود.
export const PHONE_STATUSES: PhoneStatus[] = [
  'موجود در انبار',
  'فروخته شده',
  'مرجوعی',
  'فروخته شده (قسطی)',
  'مرجوعی اقساطی',
];
export const REPAIR_STATUSES: RepairStatus[] = [
  'پذیرش شده', 'در حال بررسی', 'منتظر قطعه', 'در حال تعمیر', 'آماده تحویل', 'تحویل داده شده', 'تعمیر نشد', 'مرجوع شد',
];
