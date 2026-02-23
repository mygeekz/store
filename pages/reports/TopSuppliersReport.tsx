// pages/reports/TopSuppliersReportPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import moment from 'jalali-moment';
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

import { TopSupplierReportItem, NotificationMessage } from '../../types';
import Notification from '../../components/Notification';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import SavedViewsBar from '../../components/SavedViewsBar';
import ExportMenu from '../../components/ExportMenu';
import { Search, Truck, Trophy, TrendingUp } from '../../components/icons';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthHeaders } from '../../utils/apiUtils';

const formatPrice = (n: number) => (n ?? 0).toLocaleString('fa-IR') + ' تومان';
const formatNum = (n: number) => (n ?? 0).toLocaleString('fa-IR');

const columnHelper = createColumnHelper<TopSupplierReportItem>();

function toCSV(rows: Record<string, any>[]) {
  const esc = (v: any) => {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const headers = Object.keys(rows[0] ?? {});
  const lines = [headers.map(esc).join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))];
  return '\uFEFF' + lines.join('\n');
}

function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const TopSuppliersReportPage: React.FC = () => {
  const { token } = useAuth();

  const [topSuppliers, setTopSuppliers] = useState<TopSupplierReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [startDate, setStartDate] = useState<Date | null>(moment().subtract(30, 'days').toDate());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [globalFilter, setGlobalFilter] = useState('');

  const savedViewState = useMemo(
    () => ({
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
    }),
    [startDate, endDate]
  );

  const fetchTopSuppliers = async () => {
    if (!startDate || !endDate || !token) {
      setNotification({ type: 'error', text: 'لطفاً تاریخ شروع و پایان را انتخاب کنید.' });
      return;
    }
    setIsLoading(true);
    setNotification(null);
    setTopSuppliers([]);

    // IMPORTANT: server expects Jalali format (jYYYY/jMM/jDD)
    const fromDate = moment(startDate).locale('en').format('jYYYY/jMM/jDD');
    const toDate = moment(endDate).locale('en').format('jYYYY/jMM/jDD');

    try {
      const res = await fetch(`/api/reports/top-suppliers?fromDate=${fromDate}&toDate=${toDate}`, {
        headers: getAuthHeaders(token),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت گزارش تامین‌کنندگان برتر');
      setTopSuppliers(json.data);
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message || 'خطای نامشخص' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
  if (!token) return;
  const t = window.setTimeout(() => { fetchTopSuppliers(); }, 250);
  return () => window.clearTimeout(t);
}, [token, fromDate, toDate]);

  const insights = useMemo(() => {
    const rows = topSuppliers ?? [];
    const total = rows.reduce((s, r) => s + (r.totalPurchaseValue ?? 0), 0);
    const totalTx = rows.reduce((s, r) => s + (r.transactionCount ?? 0), 0);
    const avg = totalTx > 0 ? Math.round(total / totalTx) : 0;
    const top1 = rows[0];
    const topShare = total > 0 && top1 ? Math.round(((top1.totalPurchaseValue ?? 0) / total) * 100) : 0;
    return {
      count: rows.length,
      total,
      totalTx,
      avg,
      topName: top1?.partnerName ?? '—',
      topValue: top1?.totalPurchaseValue ?? 0,
      topShare,
    };
  }, [topSuppliers]);

  const chartData = useMemo(() => {
    const rows = (topSuppliers ?? []).slice(0, 10);
    return rows.map((r, idx) => ({
      رتبه: idx + 1,
      تامین‌کننده: (r.partnerName ?? '').length > 14 ? (r.partnerName ?? '').slice(0, 14) + '…' : r.partnerName ?? '—',
      خرید: r.totalPurchaseValue ?? 0,
    }));
  }, [topSuppliers]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('partnerName', { header: 'نام تامین‌کننده' }),
      columnHelper.accessor('totalPurchaseValue', {
        header: 'مجموع خرید از تامین‌کننده',
        cell: (info) => (
          <span className="font-semibold text-emerald-700 dark:text-emerald-300">{formatPrice(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor('transactionCount', {
        header: 'تعداد تراکنش‌ها',
        cell: (info) => formatNum(info.getValue()),
      }),
      columnHelper.accessor('partnerId', {
        header: 'پروفایل',
        cell: (info) => (
          <Link to={`/partners/${info.getValue()}`} className="text-indigo-600 dark:text-indigo-300 hover:underline">
            مشاهده جزئیات
          </Link>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: topSuppliers,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  });

  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;

  const exportItems = useMemo(() => {
    const fromLabel = startDate ? moment(startDate).format('jYYYY/jMM/jDD') : '—';
    const toLabel = endDate ? moment(endDate).format('jYYYY/jMM/jDD') : '—';
    return [
      {
        key: 'csv',
        label: 'خروجی CSV (اکسل)',
        icon: 'fas fa-file-csv',
        disabled: topSuppliers.length === 0,
        onClick: () => {
          const rows = (topSuppliers ?? []).map((r, i) => ({
            'رتبه': i + 1,
            'نام تامین‌کننده': r.partnerName ?? '',
            'مجموع خرید (تومان)': r.totalPurchaseValue ?? 0,
            'تعداد تراکنش': r.transactionCount ?? 0,
            'شناسه تامین‌کننده': r.partnerId ?? '',
          }));
          downloadTextFile(`TopSuppliers_${fromLabel}_to_${toLabel}.csv`, toCSV(rows));
        },
      },
    ];
  }, [topSuppliers, startDate, endDate]);

  return (
    <div className="report-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <div className="rounded-2xl shadow-lg p-5 sm:p-6 bg-surface text-text dark:shadow-none border border-primary/10">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <Truck size={22} className="text-sky-700 dark:text-sky-300" />
              <h2 className="text-xl font-semibold">گزارش تامین‌کنندگان برتر</h2>
            </div>
            <p className="text-sm text-muted mt-1">
              تامین‌کنندگان برتر بر اساس <span className="font-medium">مجموع خرید</span> در بازه انتخابی (نمودار + خروجی).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ExportMenu items={exportItems} className="shrink-0" />
            <button
              onClick={fetchTopSuppliers}
              disabled={isLoading || !token}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:bg-primary-400 transition-colors"
              title="به‌روزرسانی"
            >
              <TrendingUp size={18} className="opacity-80" />
              {isLoading ? 'درحال بروزرسانی…' : 'بروزرسانی'}
            </button>
          </div>
        </div>

        {/* Filters row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
          <div className="lg:col-span-4">
            <label className="block text-sm font-medium text-text mb-1">از تاریخ</label>
            <ShamsiDatePicker
              selectedDate={startDate}
              onDateChange={setStartDate}
              inputClassName="w-full p-2.5 rounded-xl border border-primary/20 bg-white dark:bg-black/30"
            />
          </div>

          <div className="lg:col-span-4">
            <label className="block text-sm font-medium text-text mb-1">تا تاریخ</label>
            <ShamsiDatePicker
              selectedDate={endDate}
              onDateChange={(d) => setEndDate(d && startDate && d < startDate ? startDate : d)}
              inputClassName="w-full p-2.5 rounded-xl border border-primary/20 bg-white dark:bg-black/30"
            />
          </div>

          <div className="lg:col-span-4">
            <label className="block text-sm font-medium text-text mb-1">جستجو در جدول</label>
            <div className="relative">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                <Search size={18} />
              </span>
              <input
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="نام تامین‌کننده، …"
                className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-primary/20 bg-white dark:bg-black/30 outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="lg:col-span-12">
            <SavedViewsBar
              storageKey="app:savedViews:reports:topSuppliers:v2"
              currentState={{ ...savedViewState }}
              onApply={(st) => {
                setStartDate(st.startDate ? new Date(st.startDate) : null);
                setEndDate(st.endDate ? new Date(st.endDate) : null);
              }}
              label="بازه"
            />
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">تعداد تامین‌کننده</span>
              <Truck size={18} className="text-primary-600 dark:text-primary-300" />
            </div>
            <div className="mt-2 text-2xl font-semibold">{formatNum(insights.count)}</div>
            <div className="mt-1 text-xs text-muted">فهرست تامین‌کنندگان برتر در بازه</div>
          </div>

          <div className="rounded-2xl border border-primary/10 bg-emerald-500/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">مجموع خرید</span>
              <TrendingUp size={18} className="text-emerald-700 dark:text-emerald-300" />
            </div>
            <div className="mt-2 text-2xl font-semibold">{formatPrice(insights.total)}</div>
            <div className="mt-1 text-xs text-muted">جمع کل خرید از تامین‌کنندگان این لیست</div>
          </div>

          <div className="rounded-2xl border border-primary/10 bg-indigo-500/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">تعداد تراکنش</span>
              <span className="text-indigo-700 dark:text-indigo-300 font-bold">Σ</span>
            </div>
            <div className="mt-2 text-2xl font-semibold">{formatNum(insights.totalTx)}</div>
            <div className="mt-1 text-xs text-muted">تعداد کل خرید/ثبت‌های این گزارش</div>
          </div>

          <div className="rounded-2xl border border-primary/10 bg-amber-500/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">میانگین خرید هر تراکنش</span>
              <Trophy size={18} className="text-amber-700 dark:text-amber-300" />
            </div>
            <div className="mt-2 text-2xl font-semibold">{formatPrice(insights.avg)}</div>
            <div className="mt-1 text-xs text-muted">
              نفر اول: <span className="font-medium">{insights.topName}</span> ({formatNum(insights.topShare)}٪ سهم)
            </div>
          </div>
        </div>

        {/* Chart */}
        {topSuppliers.length > 0 && (
          <div className="rounded-2xl border border-primary/10 bg-white/60 dark:bg-black/20 p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">۱۰ تامین‌کننده اول بر اساس مجموع خرید</div>
              <div className="text-xs text-muted">مقیاس: تومان</div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="تامین‌کننده" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => String(v).toLocaleString('fa-IR')} width={90} />
                  <Tooltip formatter={(v: any) => formatPrice(Number(v ?? 0))} />
                  <Bar dataKey="خرید" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* States */}
        {isLoading && topSuppliers.length === 0 && (
          <div className="p-10 text-center text-muted">
            <div className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-primary/20 animate-pulse" />
            </div>
            <p className="mt-3">در حال بارگذاری گزارش…</p>
          </div>
        )}
        {!isLoading && topSuppliers.length === 0 && (
          <div className="p-10 text-center text-muted">
            <Truck size={34} className="mx-auto mb-3 opacity-70" />
            <p>داده‌ای برای این بازه یافت نشد.</p>
          </div>
        )}

        {/* Table */}
        {topSuppliers.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-2xl border border-primary/10">
              <table className="min-w-full divide-y divide-primary/10 text-sm">
                <thead className="bg-primary/5">
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      <th className="px-6 py-3 text-right font-semibold whitespace-nowrap">رتبه</th>
                      {hg.headers.map((h) => (
                        <th key={h.id} className="px-6 py-3 text-right font-semibold whitespace-nowrap">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800/60">
                  {table.getRowModel().rows.map((row, i) => (
                    <tr key={row.id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-6 py-4 font-medium">
                        <span className="inline-flex items-center justify-center min-w-[2.25rem] h-8 rounded-full bg-primary/10 border border-primary/15">
                          {formatNum(pageIndex * pageSize + i + 1)}
                        </span>
                      </td>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {table.getPageCount() > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-t border-primary/10 text-sm">
                <div className="flex items-center gap-2">
                  <button
                    className="px-2 py-1 rounded-lg border border-primary/15 hover:bg-primary/5 disabled:opacity-50"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                  >
                    «
                  </button>
                  <button
                    className="px-2 py-1 rounded-lg border border-primary/15 hover:bg-primary/5 disabled:opacity-50"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    ‹
                  </button>
                  <button
                    className="px-2 py-1 rounded-lg border border-primary/15 hover:bg-primary/5 disabled:opacity-50"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    ›
                  </button>
                  <button
                    className="px-2 py-1 rounded-lg border border-primary/15 hover:bg-primary/5 disabled:opacity-50"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                  >
                    »
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-muted">صفحه</span>
                  <strong>
                    {formatNum(pageIndex + 1)} از {formatNum(table.getPageCount())}
                  </strong>
                </div>

                <select
                  value={pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}
                  className="p-2 rounded-xl border border-primary/20 bg-white dark:bg-black/30"
                >
                  <option value="10">نمایش ۱۰</option>
                  <option value="20">نمایش ۲۰</option>
                  <option value="50">نمایش ۵۰</option>
                </select>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TopSuppliersReportPage;
