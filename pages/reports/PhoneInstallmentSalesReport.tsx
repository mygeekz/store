// pages/reports/PhoneInstallmentSalesReportPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import moment from 'jalali-moment';
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';

import { PhoneInstallmentSaleProfitReportItem, NotificationMessage } from '../../types';
import Notification from '../../components/Notification';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import SavedViewsBar from '../../components/SavedViewsBar';
import { formatIsoToShamsiDateTime } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../utils/apiFetch';

import {
  Calendar,
  Search,
  RefreshCw,
  TrendingUp,
  Wallet,
  Percent,
  Smartphone,
  ArrowLeft,
  BadgeCheck,
} from '../../components/icons';

const columnHelper = createColumnHelper<PhoneInstallmentSaleProfitReportItem>();

const money = (v: number) => `${(v ?? 0).toLocaleString('fa-IR')} تومان`;

const priceColored = (v: number) => {
  const cls =
    v > 0 ? 'text-emerald-600 dark:text-emerald-400'
    : v < 0 ? 'text-rose-600 dark:text-rose-400'
    : 'text-text';
  return <span className={`font-semibold ${cls}`}>{(v ?? 0).toLocaleString('fa-IR')} تومان</span>;
};
const pricePlain = (v: number) => money(v);

const pill =
  'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200';
const card =
  'rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-white/5';
const cardPad = 'p-4 md:p-5';

function ProgressBar({ value, max }: { value: number; max: number }) {
  const p = max <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
      <div className="h-full rounded-full bg-slate-900 dark:bg-white" style={{ width: `${p}%` }} />
    </div>
  );
}

const PhoneInstallmentSalesReportPage: React.FC = () => {
  const { token } = useAuth();
  const [reportData, setReportData] = useState<PhoneInstallmentSaleProfitReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  // پیش‌فرض: ۳۰ روز گذشته
  const [startDate, setStartDate] = useState<Date | null>(moment().subtract(30, 'day').toDate());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const savedViewState = useMemo(() => ({
    startDate: startDate ? startDate.toISOString() : null,
    endDate: endDate ? endDate.toISOString() : null,
  }), [startDate, endDate]);

  const [globalFilter, setGlobalFilter] = useState('');

  const fetchReport = async () => {
    if (!startDate || !endDate || !token) {
      setNotification({ type: 'error', text: 'لطفاً تاریخ شروع و پایان را انتخاب کنید.' });
      return;
    }
    setIsLoading(true);
    setNotification(null);
    setReportData([]);

    // جلالی صحیح
    const fromDateShamsi = moment(startDate).locale('en').format('jYYYY/jMM/jDD');
    const toDateShamsi = moment(endDate).locale('en').format('jYYYY/jMM/jDD');

    try {
      const res = await apiFetch(
        `/api/reports/phone-installment-sales?fromDate=${fromDateShamsi}&toDate=${toDateShamsi}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت گزارش فروش اقساطی موبایل');
      setReportData(json.data);
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
  if (!token) return;
  const t = window.setTimeout(() => { fetchReport(); }, 250);
  return () => window.clearTimeout(t);
}, [token, fromDate, toDate]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('dateCreated', {
        header: 'تاریخ ثبت',
        cell: info => formatIsoToShamsiDateTime(info.getValue(), 'jD jMMMM jYYYY - HH:mm'),
      }),
      columnHelper.accessor('customerFullName', { header: 'مشتری' }),
      columnHelper.accessor('phoneModel', {
        header: 'مدل گوشی و IMEI',
        cell: info => (
          <div>
            <p>{info.getValue()}</p>
            <p className="text-xs text-muted" dir="ltr">
              {info.row.original.imei}
            </p>
          </div>
        ),
      }),
      columnHelper.accessor('purchasePrice', {
        header: 'قیمت خرید',
        cell: info => pricePlain(info.getValue()),
      }),
      columnHelper.accessor('actualSalePrice', {
        header: 'مبلغ فروش اقساطی',
        cell: info => pricePlain(info.getValue()),
      }),
      columnHelper.accessor('totalProfit', {
        header: 'سود کل',
        cell: info => priceColored(info.getValue()),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: reportData,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  });

  const filteredRows = table.getFilteredRowModel().rows;
  const totalProfit = filteredRows.reduce((s, r) => s + (r.original.totalProfit ?? 0), 0);
  const totalSaleValue = filteredRows.reduce((s, r) => s + (r.original.actualSalePrice ?? 0), 0);
  const count = filteredRows.length;
  const avgProfit = count ? Math.round(totalProfit / count) : 0;
  const avgSale = count ? Math.round(totalSaleValue / count) : 0;

  const topCustomers = useMemo(() => {
    const map = new Map<string, { name: string; value: number; profit: number; count: number }>();
    for (const r of reportData) {
      const name = (r.customerFullName || 'مشتری نامشخص').trim();
      const cur = map.get(name) || { name, value: 0, profit: 0, count: 0 };
      cur.value += r.actualSalePrice ?? 0;
      cur.profit += r.totalProfit ?? 0;
      cur.count += 1;
      map.set(name, cur);
    }
    return Array.from(map.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [reportData]);
  const topMax = topCustomers.length ? Math.max(...topCustomers.map(x => x.value)) : 0;

  return (
    <div className="report-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <div className="report-surface report-surface-inner">
        {/* Premium header */}
        <div className="mb-6 rounded-3xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm dark:border-white/10 dark:from-white/5 dark:to-white/0">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white truncate">
                    فروش اقساطی موبایل
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={pill}>
                      <BadgeCheck className="h-4 w-4" />
                      تحلیل سود و ارزش فروش اقساطی
                    </span>
                    <span className={pill}>
                      <Calendar className="h-4 w-4" />
                      {startDate ? moment(startDate).locale('fa').format('jYYYY/jMM/jDD') : '—'}
                      <span className="text-slate-400 dark:text-white/40">تا</span>
                      {endDate ? moment(endDate).locale('fa').format('jYYYY/jMM/jDD') : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="inline-flex items-center gap-2 h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-50 transition dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                بازگشت
              </button>
              <button
                onClick={fetchReport}
                disabled={isLoading || !token}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition shadow-sm dark:bg-white dark:text-slate-900 dark:hover:bg-white/90"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'درحال بارگذاری…' : 'به‌روزرسانی'}
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={`${card} ${cardPad} mb-6`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">از تاریخ</label>
                <ShamsiDatePicker
                  selectedDate={startDate}
                  onDateChange={setStartDate}
                  inputClassName="w-full md:w-64 h-10 px-3 rounded-xl border border-slate-200 bg-white dark:bg-white/5 dark:border-white/10"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">تا تاریخ</label>
                <ShamsiDatePicker
                  selectedDate={endDate}
                  onDateChange={setEndDate}
                  inputClassName="w-full md:w-64 h-10 px-3 rounded-xl border border-slate-200 bg-white dark:bg-white/5 dark:border-white/10"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="جستجو: مدل، IMEI، مشتری…"
                  value={globalFilter}
                  onChange={e => setGlobalFilter(e.target.value)}
                  className="w-full md:w-72 h-10 pr-9 pl-3 rounded-xl border border-slate-200 bg-white text-sm dark:bg-white/5 dark:border-white/10"
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <SavedViewsBar
              storageKey="app:savedViews:reports:phoneInstallments:v1"
              currentState={{ ...savedViewState }}
              onApply={(st) => {
                setStartDate(st.startDate ? new Date(st.startDate) : null);
                setEndDate(st.endDate ? new Date(st.endDate) : null);
              }}
              label="بازه"
            />
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div className={`${card} ${cardPad}`}>
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300">تعداد قرارداد</div>
              <TrendingUp className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">{count.toLocaleString('fa-IR')}</div>
          </div>
          <div className={`${card} ${cardPad}`}>
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300">مجموع ارزش فروش</div>
              <Wallet className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white">{money(totalSaleValue)}</div>
          </div>
          <div className={`${card} ${cardPad}`}>
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300">مجموع سود</div>
              <Percent className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2 text-xl font-extrabold">{priceColored(totalProfit)}</div>
          </div>
          <div className={`${card} ${cardPad}`}>
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300">میانگین فروش / سود</div>
              <Percent className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{money(avgSale)}</div>
            <div className="mt-1 text-sm font-bold">سود: {priceColored(avgProfit)}</div>
          </div>
        </div>

        {/* Top customers */}
        {topCustomers.length > 0 && (
          <div className={`${card} ${cardPad} mb-6`}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">Top مشتریان اقساطی</div>
              <span className="text-xs text-slate-500 dark:text-slate-300">بر اساس مبلغ قرارداد</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {topCustomers.map((m, idx) => (
                <div key={m.name} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs text-slate-500 dark:text-slate-300">#{idx + 1}</div>
                      <div className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white truncate">{m.name}</div>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-300">{m.count.toLocaleString('fa-IR')} مورد</div>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={m.value} max={topMax} />
                  </div>
                  <div className="mt-2 text-xs text-slate-700 dark:text-slate-200">{money(m.value)}</div>
                  <div className="mt-1 text-xs">سود: {priceColored(m.profit)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="p-10 text-center text-slate-500">درحال دریافت داده‌ها…</div>
        ) : table.getRowModel().rows.length === 0 ? (
          <div className="p-10 text-center text-slate-500">گزارشی برای نمایش در این بازه زمانی یافت نشد.</div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
                <thead className="bg-slate-50 sticky top-0 z-10 dark:bg-white/5">
                  {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id}>
                      {hg.headers.map(h => (
                        <th
                          key={h.id}
                          className="px-4 py-3 text-right text-xs font-extrabold text-slate-600 dark:text-slate-200"
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                  {table.getRowModel().rows.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors dark:hover:bg-white/5">
                      {r.getVisibleCells().map(c => (
                        <td key={c.id} className="px-4 py-3">
                          {flexRender(c.column.columnDef.cell, c.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {table.getPageCount() > 1 && (
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-4 border-t border-slate-200 text-sm dark:border-white/10">
                <div className="flex items-center gap-2">
                  {[
                    { t: '«', on: () => table.setPageIndex(0), dis: !table.getCanPreviousPage() },
                    { t: '‹', on: () => table.previousPage(), dis: !table.getCanPreviousPage() },
                    { t: '›', on: () => table.nextPage(), dis: !table.getCanNextPage() },
                    { t: '»', on: () => table.setPageIndex(table.getPageCount() - 1), dis: !table.getCanNextPage() },
                  ].map((b, i) => (
                    <button
                      key={i}
                      onClick={b.on}
                      disabled={b.dis}
                      className="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition dark:border-white/10 dark:bg-white/5"
                    >
                      {b.t}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span>صفحه</span>
                  <strong>
                    {table.getState().pagination.pageIndex + 1} از {table.getPageCount()}
                  </strong>
                </div>
                <select
                  value={table.getState().pagination.pageSize}
                  onChange={e => table.setPageSize(Number(e.target.value))}
                  className="h-9 px-2 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5"
                >
                  <option value="10">نمایش 10</option>
                  <option value="20">نمایش 20</option>
                  <option value="50">نمایش 50</option>
                </select>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PhoneInstallmentSalesReportPage;
