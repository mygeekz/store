import React, {useEffect, useMemo, useRef, useState} from 'react';
import moment from 'jalali-moment';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import Notification from '../../components/Notification';
import Modal from '../../components/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthHeaders } from '../../utils/apiUtils';
import { exportToExcel } from '../../utils/exporters';
import { FinancialOverviewData, NotificationMessage } from '../../types';
import TelegramTopicPanel from '../../components/TelegramTopicPanel';


import { useReportsExports } from '../../contexts/ReportsExportsContext';

const fmtMoney = (n: number | undefined | null) =>
  (n ?? 0).toLocaleString('fa-IR') + ' تومان';

const toShamsiStr = (d: Date) => moment(d).locale('en').format('jYYYY/jMM/jDD');

const FinancialOverviewPage: React.FC = () => {
  const { registerReportExports } = useReportsExports();
  const exportExcelRef = useRef<() => void>(() => {});

  const { token } = useAuth();
  const [tab, setTab] = useState<'main' | 'telegram'>('main');

  const monthStart = useMemo(() => {
    const m = moment();
    const j = moment(`${m.locale('fa').format('jYYYY/jMM')}/01`, 'jYYYY/jMM/jDD');
    return j.toDate();
  }, []);

  const [fromDate, setFromDate] = useState<Date | null>(monthStart);
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [data, setData] = useState<FinancialOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);


// Saved Filters
const [savedFilters, setSavedFilters] = useState<Array<{ id: number; name: string; filters: any }>>([]);
const [selectedFilterId, setSelectedFilterId] = useState<number | ''>('');
const [isSavingFilter, setIsSavingFilter] = useState(false);

// Drill-down
const [drillOpen, setDrillOpen] = useState(false);
const [drillKpi, setDrillKpi] = useState<'totalSales' | 'productSalesTotal' | 'grossProfit'>('totalSales');
const [drillRows, setDrillRows] = useState<any[]>([]);
const [drillLoading, setDrillLoading] = useState(false);

// Scheduling
const [scheduleOpen, setScheduleOpen] = useState(false);
const [scheduleType, setScheduleType] = useState<'daily'|'weekly'|'monthly'>('daily');
const [scheduleTime, setScheduleTime] = useState('09:00');
const [scheduleWeekdays, setScheduleWeekdays] = useState<number[]>([6]); // شنبه
const [scheduleMonthDay, setScheduleMonthDay] = useState<number>(1);
const [scheduleCron, setScheduleCron] = useState('0 9 * * *'); // computed
const [scheduleCreating, setScheduleCreating] = useState(false);


  

const loadSavedFilters = async () => {
  try {
    if (!token) return;
    const resp = await fetch(`/api/reports/saved-filters?reportKey=financial-overview`, {
      headers: { ...getAuthHeaders(token) },
    });
    const j = await resp.json();
    if (j?.success) setSavedFilters(j.data || []);
  } catch {
    // ignore
  }
};

const applySavedFilter = (id: number) => {
  const f = savedFilters.find((x) => x.id === id);
  if (!f) return;
  const from = f.filters?.from ? fromShamsiToDate(String(f.filters.from)) : null;
  const to = f.filters?.to ? fromShamsiToDate(String(f.filters.to)) : null;
  if (from) setFromDate(from);
  if (to) setToDate(to);
};

const saveCurrentFilter = async () => {
  try {
    if (!token) return;
    const name = prompt('نام فیلتر را وارد کنید:');
    if (!name) return;

    setIsSavingFilter(true);
    const body = {
      reportKey: 'financial-overview',
      name,
      filters: { from: fromDate ? toShamsiStr(fromDate) : null, to: toDate ? toShamsiStr(toDate) : null },
    };
    const resp = await fetch(`/api/reports/saved-filters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
      body: JSON.stringify(body),
    });
    const j = await resp.json();
    if (j?.success) {
      setNotification({ type: 'success', message: 'فیلتر ذخیره شد.' });
      await loadSavedFilters();
    } else {
      setNotification({ type: 'error', message: j?.message || 'خطا در ذخیره فیلتر' });
    }
  } finally {
    setIsSavingFilter(false);
  }
};

const deleteSavedFilter = async (id: number) => {
  if (!token) return;
  if (!confirm('این فیلتر حذف شود؟')) return;
  const resp = await fetch(`/api/reports/saved-filters/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders(token) },
  });
  const j = await resp.json();
  if (j?.success) {
    setNotification({ type: 'success', message: 'فیلتر حذف شد.' });
    if (selectedFilterId === id) setSelectedFilterId('');
    await loadSavedFilters();
  }
};

const openDrilldown = async (kpi: 'totalSales' | 'productSalesTotal' | 'grossProfit') => {
  try {
    if (!token) return;
    setDrillKpi(kpi);
    setDrillOpen(true);
    setDrillLoading(true);
    const from = fromDate ? toShamsiStr(fromDate) : '';
    const to = toDate ? toShamsiStr(toDate) : '';
    const url = `/api/reports/financial-overview/drilldown?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&kpi=${encodeURIComponent(kpi)}`;
    const resp = await fetch(url, { headers: { ...getAuthHeaders(token) } });
    const j = await resp.json();
    if (j?.success) setDrillRows(j.data || []);
    else setDrillRows([]);
  } finally {
    setDrillLoading(false);
  }
};


const buildCronFromUi = () => {
  const [hh, mm] = String(scheduleTime || '09:00').split(':');
  const hour = Math.max(0, Math.min(23, Number(hh || 9)));
  const minute = Math.max(0, Math.min(59, Number(mm || 0)));

  if (scheduleType === 'daily') {
    return `${minute} ${hour} * * *`;
  }
  if (scheduleType === 'weekly') {
    const days = (scheduleWeekdays || []).length ? scheduleWeekdays : [6];
    // cron day-of-week: 0=Sunday ... 6=Saturday
    const dow = Array.from(new Set(days)).sort().join(',');
    return `${minute} ${hour} * * ${dow}`;
  }
  // monthly
  const day = Math.max(1, Math.min(31, Number(scheduleMonthDay || 1)));
  return `${minute} ${hour} ${day} * *`;
};

const scheduleSummaryFa = () => {
  const time = scheduleTime || '09:00';
  if (scheduleType === 'daily') return `روزانه ساعت ${time}`;
  if (scheduleType === 'weekly') {
    const map: Record<number,string> = {0:'یکشنبه',1:'دوشنبه',2:'سه‌شنبه',3:'چهارشنبه',4:'پنجشنبه',5:'جمعه',6:'شنبه'};
    const days = (scheduleWeekdays || []).length ? scheduleWeekdays : [6];
    return `هفتگی (${days.map(d=>map[d]).join('، ')}) ساعت ${time}`;
  }
  return `ماهانه (روز ${scheduleMonthDay}) ساعت ${time}`;
};

const createSchedule = async () => {
  try {
    if (!token) return;
    setScheduleCreating(true);
    const resp = await fetch(`/api/reports/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
      body: JSON.stringify({ reportKey: 'financial-overview', cronExpr: buildCronFromUi(), payloadJson: { scheduleType, scheduleTime, scheduleWeekdays, scheduleMonthDay, range: { from: fromDate ? toShamsiStr(fromDate) : null, to: toDate ? toShamsiStr(toDate) : null } }, channel: 'telegram' }),
    });
    const j = await resp.json();
    if (j?.success) {
      setNotification({ type: 'success', message: 'زمان‌بندی ذخیره شد.' });
      setScheduleOpen(false);
    } else {
      setNotification({ type: 'error', message: j?.message || 'خطا در زمان‌بندی' });
    }
  } finally {
    setScheduleCreating(false);
  }
};

const fetchData = async (override?: { from?: Date | null; to?: Date | null }) => {
    if (!token) return;
    const effectiveFrom = override?.from ?? fromDate;
    const effectiveTo = override?.to ?? toDate;
    const from = effectiveFrom ? toShamsiStr(effectiveFrom) : undefined;
    const to = effectiveTo ? toShamsiStr(effectiveTo) : undefined;
    setIsLoading(true);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);

      const res = await fetch(`/api/reports/financial-overview?${qs.toString()}`, {
        headers: getAuthHeaders(token),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت گزارش');
      setData(json.data);
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message || 'خطا در دریافت گزارش' });
    } finally {
      setIsLoading(false);
    }
  };


const categoryName = (c: string) =>
  c === 'rent' ? 'اجاره' : c === 'salary' ? 'حقوق' : c === 'inventory' ? 'خرید کالا' : 'هزینه‌های جانبی';

const categoryColor = (c: string) =>
  c === 'rent' ? '#38bdf8' : c === 'salary' ? '#34d399' : c === 'inventory' ? '#fb7185' : '#a78bfa';

// simple SVG donut chart
const ExpensePie = ({ rows, total }: { rows: { category: string; total: number }[]; total: number }) => {
  const radius = 44;
  const cx = 56;
  const cy = 56;
  let start = 0;

  const arcs = (rows || []).filter(r => Number(r.total||0) > 0).map((r) => {
    const value = Number(r.total || 0);
    const frac = total > 0 ? value / total : 0;
    const end = start + frac * Math.PI * 2;

    const x1 = cx + radius * Math.cos(start);
    const y1 = cy + radius * Math.sin(start);
    const x2 = cx + radius * Math.cos(end);
    const y2 = cy + radius * Math.sin(end);
    const large = end - start > Math.PI ? 1 : 0;

    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
    const seg = { d, color: categoryColor(r.category), category: r.category, value };

    start = end;
    return seg;
  });

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg width="112" height="112" viewBox="0 0 112 112" className="drop-shadow-sm">
        <circle cx={cx} cy={cy} r={radius} fill="#e5e7eb" className="dark:fill-slate-800" />
        {arcs.map((a, i) => (
          <path key={i} d={a.d} fill={a.color} opacity={0.95} />
        ))}
        <circle cx={cx} cy={cy} r="28" fill="white" className="dark:fill-slate-900" />
        <text x={cx} y={cy-2} textAnchor="middle" className="fill-slate-900 dark:fill-slate-100" fontSize="10" fontWeight="700">
          هزینه‌ها
        </text>
        <text x={cx} y={cy+14} textAnchor="middle" className="fill-slate-600 dark:fill-slate-300" fontSize="9">
          {fmtMoney(total)}
        </text>
      </svg>

      <div className="space-y-2">
        {(rows || []).map((r) => (
          <div key={r.category} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 shrink-0">
              <span className="h-3 w-3 rounded-sm" style={{ background: categoryColor(r.category) }} />
              <span className="text-gray-700 dark:text-gray-200">{categoryName(r.category)}</span>
            </div>
            <div className="font-semibold">{fmtMoney(Number(r.total || 0))}</div>
          </div>
        ))}
      </div>
    </div>
  );
};


  useEffect(() => {
    if (!token) return;
    const t = window.setTimeout(() => { void fetchData(); }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, fromDate, toDate]);

  const exportExcel = () => {
    if (!data) return;
    const rows: any[] = [];

    rows.push({ بخش: 'بازه', عنوان: 'از', مقدار: data.range.from });
    rows.push({ بخش: 'بازه', عنوان: 'تا', مقدار: data.range.to });
    rows.push({});

    rows.push({ بخش: 'فروش', عنوان: 'تعداد سفارش', مقدار: data.sales.ordersCount });
    rows.push({ بخش: 'فروش', عنوان: 'جمع فروش (با مالیات)', مقدار: data.sales.totalSales });
    rows.push({ بخش: 'فروش', عنوان: 'خالص فروش قبل از مالیات', مقدار: data.sales.netSalesBeforeTax });
    rows.push({ بخش: 'فروش', عنوان: 'تخفیف‌ها', مقدار: data.sales.discounts });
    rows.push({ بخش: 'فروش', عنوان: 'مالیات', مقدار: data.sales.taxAmount });
    rows.push({ بخش: 'فروش', عنوان: 'مرجوعی‌ها', مقدار: data.sales.refundsTotal });
    rows.push({});

    rows.push({ بخش: 'سود', عنوان: 'COGS', مقدار: data.profit.cogs });
    rows.push({ بخش: 'سود', عنوان: 'سود ناخالص', مقدار: data.profit.grossProfit });
    rows.push({});

    rows.push({ بخش: 'گردش', عنوان: 'خریدها', مقدار: data.purchases.total });
    rows.push({ بخش: 'گردش', عنوان: 'موجودی انبار (ارزش خرید)', مقدار: data.inventory.inventoryValue });
    rows.push({ بخش: 'گردش', عنوان: 'مطالبات مشتریان', مقدار: data.workingCapital.receivables });
    rows.push({ بخش: 'گردش', عنوان: 'بدهی به تامین‌کنندگان', مقدار: data.workingCapital.payables });
    rows.push({});

    rows.push({ بخش: 'Top', عنوان: 'بدهکاران', مقدار: '' });
    (data.top.debtors || []).slice(0, 20).forEach((d: any) => {
      rows.push({ بخش: 'بدهکار', عنوان: d.fullName || d.name, مقدار: d.balance });
    });
    rows.push({});
    rows.push({ بخش: 'Top', عنوان: 'بستانکاران', مقدار: '' });
    (data.top.creditors || []).slice(0, 20).forEach((c: any) => {
      rows.push({ بخش: 'بستانکار', عنوان: c.name, مقدار: c.balance });
    });

    exportToExcel(
      `financial-overview-${new Date().toISOString().slice(0, 10)}.xlsx`,
      rows,
      [
        { header: 'بخش', key: 'بخش' },
        { header: 'عنوان', key: 'عنوان' },
        { header: 'مقدار', key: 'مقدار' },
      ],
      'Overview'
    );
  };

  // اتصال دکمه Excel بالای ReportsLayout به خروجی دقیق همین صفحه
  exportExcelRef.current = exportExcel;
  useEffect(() => {
    registerReportExports({ excel: () => exportExcelRef.current() });
    return () => registerReportExports({});
  }, [registerReportExports]);


  return (
    <div className="report-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <div className="relative overflow-hidden rounded-3xl border border-gray-200/70 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="absolute inset-0 pointer-events-none opacity-60" style={{ background: 'radial-gradient(800px 240px at 85% 0%, rgba(99,102,241,0.10), transparent), radial-gradient(700px 220px at 10% 100%, rgba(20,184,166,0.10), transparent)' }} />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200/70 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/40">📊</span>
              <div>
                <h1 className="text-xl font-extrabold text-gray-900 dark:text-slate-50">نمای کلی مالی</h1>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  خلاصه فروش، سود، خرید و گردش نقدی در بازه انتخابی
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 shrink-0 rounded-2xl border border-gray-200/70 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950/30">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300">از</span>
              <ShamsiDatePicker selectedDate={fromDate} onDateChange={setFromDate} inputClassName="w-48" />
            </div>
            <div className="flex items-center gap-2 shrink-0 rounded-2xl border border-gray-200/70 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950/30">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300">تا</span>
              <ShamsiDatePicker selectedDate={toDate} onDateChange={setToDate} inputClassName="w-48" />
            </div>

            <button onClick={exportExcel} className="report-action report-action-muted shrink-0" disabled={!data}>
              خروجی Excel
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTab('main')}
          className={tab === 'main' ? 'report-action report-action-primary' : 'report-action report-action-muted'}
        >
          📈 گزارش
        </button>
        <button
          type="button"
          onClick={() => setTab('telegram')}
          className={tab === 'telegram' ? 'report-action report-action-primary' : 'report-action report-action-muted'}
        >
          ✈️ ارسال‌های تلگرام
        </button>
      </div>

      {tab === 'telegram' ? (
        <TelegramTopicPanel
          topic="reports"
          title="ارسال‌های تلگرام (گزارشات)"
          allowedTypes={[
            { key: 'financial-overview', label: 'نمای کلی مالی' },
          ]}
        />
      ) : (!data ? (
        <div className="p-10 text-center text-gray-500 dark:text-gray-400">
          {isLoading ? 'در حال دریافت...' : 'گزارش برای نمایش آماده نیست.'}
        </div>
      ) : (
        <>
          
<div className="report-toolbar mb-4">
  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
    <label className="text-sm text-gray-600 dark:text-gray-300">فیلترهای ذخیره‌شده</label>
    <select
      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
      value={selectedFilterId}
      onChange={(e) => {
        const v = e.target.value ? Number(e.target.value) : '';
        setSelectedFilterId(v as any);
        if (v) applySavedFilter(Number(v));
      }}
    >
      <option value="">انتخاب…</option>
      {savedFilters.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </select>

    <button
      className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-800"
      disabled={isSavingFilter}
      onClick={saveCurrentFilter}
    >
      ذخیره فیلتر
    </button>

    {selectedFilterId ? (
      <button
        className="rounded-lg border px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        onClick={() => deleteSavedFilter(Number(selectedFilterId))}
      >
        حذف
      </button>
    ) : null}
  </div>

  <div className="flex items-center gap-2 shrink-0">
    <button
      className="rounded-lg bg-slate-900 text-white px-3 py-2 text-sm hover:opacity-95"
      onClick={() => setScheduleOpen(true)}
    >
      زمان‌بندی ارسال تلگرام
    </button>
  </div>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-4">
            <div className="kpi-card">
              <div className="kpi-label">جمع فروش (با مالیات)</div>
              <div className="kpi-value">{fmtMoney(data.sales.totalSales)}</div>
              <div className="kpi-sub">{data.sales.ordersCount.toLocaleString('fa-IR')} سفارش</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">فروش محصولات (بدون گوشی)</div>
              <div className="kpi-value">{fmtMoney(data.sales.productSalesTotal)}</div>
              <div className="kpi-sub">فقط اقلام کالا/لوازم جانبی</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">سود ناخالص</div>
              <div className="kpi-value">{fmtMoney(data.profit.grossProfit)}</div>
              <div className="kpi-sub">COGS: {fmtMoney(data.profit.cogs)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">خریدها</div>
              <div className="kpi-value">{fmtMoney(data.purchases.total)}</div>
              <div className="kpi-sub">مرجوعی‌ها: {fmtMoney(data.sales.refundsTotal)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">جمع هزینه‌ها</div>
              <div className="kpi-value">{fmtMoney((data as any).totalExpenses)}</div>
              <div className="kpi-sub">اجاره، حقوق، خرید کالا، جانبی</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">سود واقعی</div>
              <div className="kpi-value">{fmtMoney((data as any).realProfit)}</div>
              <div className="kpi-sub">درآمد − هزینه</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-label">ارزش موجودی انبار</div>
              <div className="kpi-value">{fmtMoney(data.inventory.inventoryValue)}</div>

          {((data as any).expensesSummary?.byCategory?.length ?? 0) > 0 ? (
            <div className="kpi-card">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-sm font-semibold">تفکیک هزینه‌ها</div>

              <div className="mt-3">
                <ExpensePie rows={(data as any).expensesSummary.byCategory} total={Number((data as any).expensesSummary.total || 0)} />
              </div>

                <div className="text-sm text-gray-600 dark:text-gray-300">
                  جمع: {fmtMoney((data as any).expensesSummary?.total)}
                </div>
              </div>

              <div className="mt-3 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-800/70">
                    <tr className="text-right">
                      <th className="p-2">دسته</th>
                      <th className="p-2">مبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data as any).expensesSummary.byCategory.map((r: any) => (
                      <tr key={r.category} className="border-t border-gray-100 dark:border-slate-800">
                        <td className="p-2">
                          {r.category === 'rent' ? 'اجاره' : r.category === 'salary' ? 'حقوق' : r.category === 'inventory' ? 'خرید کالا' : 'هزینه‌های جانبی'}
                        </td>
                        <td className="p-2 font-semibold">{fmtMoney(Number(r.total || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}


              <div className="kpi-sub">مطالبات: {fmtMoney(data.workingCapital.receivables)}</div>
            </div>
          </div>

          
<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
  {(() => {
    const items = (data.top.debtors || []).slice(0, 10);
    const max = Math.max(1, ...items.map((x: any) => Math.abs(Number(x.balance || 0))));
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:bg-slate-900/70 dark:border-slate-800">
        <div className="h-1.5 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600" />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800">
                  <i className="fa-solid fa-user-minus text-slate-700 dark:text-slate-200" />
                </span>
                <div className="min-w-0">
                  <div className="text-base font-extrabold text-slate-900 dark:text-gray-100 truncate">
                    Top بدهکاران
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    بیشترین مانده بدهی مشتریان
                  </div>
                </div>
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
              جمع: {fmtMoney(data.workingCapital.receivables)}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
              موردی برای نمایش وجود ندارد.
            </div>
          ) : (
            <div className="mt-5 space-y-2">
              {items.map((d: any, i: number) => {
                const pct = Math.max(3, Math.round((Math.abs(Number(d.balance || 0)) / max) * 100));
                return (
                  <div
                    key={d.id ?? i}
                    className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 hover:bg-slate-50 transition dark:bg-slate-900/40 dark:border-slate-800 dark:hover:bg-slate-900/60"
                  >
                    <div className="h-9 w-9 rounded-2xl bg-slate-900 text-white grid place-items-center text-sm font-extrabold shadow-sm">
                      {i + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-gray-100 truncate">
                            {d.fullName}
                          </div>
                        </div>
                        <div className="font-extrabold text-slate-900 dark:text-gray-100 whitespace-nowrap">
                          {fmtMoney(d.balance)}
                        </div>
                      </div>

                      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  })()}

  {(() => {
    const items = (data.top.creditors || []).slice(0, 10);
    const max = Math.max(1, ...items.map((x: any) => Math.abs(Number(x.balance || 0))));
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:bg-slate-900/70 dark:border-slate-800">
        <div className="h-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600" />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800">
                  <i className="fa-solid fa-user-plus text-slate-700 dark:text-slate-200" />
                </span>
                <div className="min-w-0">
                  <div className="text-base font-extrabold text-slate-900 dark:text-gray-100 truncate">
                    Top بستانکاران
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    بیشترین مانده طلب همکاران
                  </div>
                </div>
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
              جمع: {fmtMoney(data.workingCapital.payables)}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
              موردی برای نمایش وجود ندارد.
            </div>
          ) : (
            <div className="mt-5 space-y-2">
              {items.map((c: any, i: number) => {
                const pct = Math.max(3, Math.round((Math.abs(Number(c.balance || 0)) / max) * 100));
                return (
                  <div
                    key={c.id ?? i}
                    className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 hover:bg-slate-50 transition dark:bg-slate-900/40 dark:border-slate-800 dark:hover:bg-slate-900/60"
                  >
                    <div className="h-9 w-9 rounded-2xl bg-slate-900 text-white grid place-items-center text-sm font-extrabold shadow-sm">
                      {i + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-gray-100 truncate">
                            {c.name}
                          </div>
                        </div>
                        <div className="font-extrabold text-slate-900 dark:text-gray-100 whitespace-nowrap">
                          {fmtMoney(c.balance)}
                        </div>
                      </div>

                      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-cyan-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  })()}
</div>

        </>
      ))}
    
{/* Drill-down Modal */}
{drillOpen && (
  <Modal
    title={
      drillKpi === 'totalSales'
        ? 'جزئیات جمع فروش'
        : drillKpi === 'productSalesTotal'
        ? 'جزئیات فروش محصولات (بدون گوشی)'
        : 'جزئیات سود ناخالص'
    }
    onClose={() => setDrillOpen(false)}
    widthClass="max-w-3xl"
  >
    {drillLoading ? (
      <div className="p-4 text-sm text-gray-600">در حال بارگذاری…</div>
    ) : drillRows.length === 0 ? (
      <div className="p-4 text-sm text-gray-600">موردی یافت نشد.</div>
    ) : (
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-white dark:bg-slate-900">
            <tr className="text-gray-600 dark:text-gray-300">
              <th className="px-3 py-2 text-right">فاکتور</th>
              <th className="px-3 py-2 text-right">تاریخ</th>
              <th className="px-3 py-2 text-right">مشتری</th>
              <th className="px-3 py-2 text-right">مبلغ</th>
              {drillKpi === 'grossProfit' ? <th className="px-3 py-2 text-right">سود</th> : null}
            </tr>
          </thead>
          <tbody>
            {drillRows.map((r, i) => (
              <tr key={i} className="border-t border-gray-100 dark:border-slate-800">
                <td className="px-3 py-2">{r.orderId}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.date}</td>
                <td className="px-3 py-2">
                  {r.customerName || '—'}
                  {r.customerPhone ? <div className="text-xs text-gray-500">{r.customerPhone}</div> : null}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtMoney(r.amount)}</td>
                {drillKpi === 'grossProfit' ? (
                  <td className="px-3 py-2 whitespace-nowrap">{fmtMoney(r.profit)}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </Modal>
)}

{/* Schedule Modal */}
{scheduleOpen && (
  <Modal title="زمان‌بندی ارسال گزارش به تلگرام" onClose={() => setScheduleOpen(false)} widthClass="max-w-lg">
    <div className="space-y-3 text-sm">
      <div className="text-sm text-gray-600 dark:text-gray-300">
        زمان‌بندی را انتخاب کنید. (Cron به‌صورت خودکار ساخته می‌شود)
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block mb-1 text-gray-700 dark:text-gray-200">تکرار</label>
          <select
            value={scheduleType}
            onChange={(e) => setScheduleType(e.target.value as any)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="daily">روزانه</option>
            <option value="weekly">هفتگی</option>
            <option value="monthly">ماهانه</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 text-gray-700 dark:text-gray-200">ساعت</label>
          <input
            type="time"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            dir="ltr"
          />
        </div>

        {scheduleType === 'weekly' && (
          <div className="md:col-span-2">
            <label className="block mb-1 text-gray-700 dark:text-gray-200">روزهای هفته</label>
            <div className="flex flex-wrap gap-2">
              {[
                { v: 6, t: 'شنبه' },
                { v: 0, t: 'یکشنبه' },
                { v: 1, t: 'دوشنبه' },
                { v: 2, t: 'سه‌شنبه' },
                { v: 3, t: 'چهارشنبه' },
                { v: 4, t: 'پنجشنبه' },
                { v: 5, t: 'جمعه' },
              ].map((d) => (
                <button
                  type="button"
                  key={d.v}
                  onClick={() => {
                    setScheduleWeekdays((prev) =>
                      prev.includes(d.v) ? prev.filter((x) => x !== d.v) : [...prev, d.v]
                    );
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${
                    scheduleWeekdays.includes(d.v)
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {d.t}
                </button>
              ))}
            </div>
          </div>
        )}

        {scheduleType === 'monthly' && (
          <div className="md:col-span-2">
            <label className="block mb-1 text-gray-700 dark:text-gray-200">روز ماه</label>
            <input
              type="number"
              min={1}
              max={31}
              value={scheduleMonthDay}
              onChange={(e) => setScheduleMonthDay(Number(e.target.value || 1))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
              dir="ltr"
            />
          </div>
        )}
      </div>

      <div className="mt-1 text-sm">
        <div className="text-gray-700 dark:text-gray-200">
          خلاصه: <span className="font-semibold">{scheduleSummaryFa()}</span>
        </div>
        <div className="text-gray-500 mt-1">
          cronExpr: <span className="font-mono">{buildCronFromUi()}</span>
        </div>
      </div>

<div className="flex items-center justify-end gap-2 pt-2">
        <button
          className="rounded-lg border px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-800"
          onClick={() => setScheduleOpen(false)}
        >
          انصراف
        </button>
        <button
          className="rounded-lg bg-slate-900 text-white px-3 py-2 hover:opacity-95 disabled:opacity-50"
          disabled={scheduleCreating}
          onClick={createSchedule}
        >
          ثبت زمان‌بندی
        </button>
      </div>
    </div>
  </Modal>
)}

</div>
  );
};

export default FinancialOverviewPage;
