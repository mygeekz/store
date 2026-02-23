// pages/reports/SalesReportPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import moment from 'jalali-moment';
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';

import { SalesSummaryData, NotificationMessage, TopSellingItem } from '../../types';
import Notification from '../../components/Notification';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import SavedViewsBar from '../../components/SavedViewsBar';
import { formatIsoToShamsi } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthHeaders } from '../../utils/apiUtils';
import ProGate from '../../components/ProGate';

const formatPrice = (n: number) =>
  n.toLocaleString('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' تومان';

const columnHelper = createColumnHelper<TopSellingItem>();

const SalesReportPage: React.FC = () => {
  const { token } = useAuth();
  const [reportData, setReportData] = useState<SalesSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [startDate, setStartDate] = useState<Date | null>(moment().subtract(30, 'days').toDate());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const savedViewState = useMemo(() => ({
    startDate: startDate ? startDate.toISOString() : null,
    endDate: endDate ? endDate.toISOString() : null,
  }), [startDate, endDate]);
  const [globalFilter, setGlobalFilter] = useState('');

  const fetchSalesReport = async () => {
    if (!startDate || !endDate || !token) {
      setNotification({ type: 'error', text: 'لطفاً تاریخ شروع و پایان را انتخاب کنید و از ورود خود مطمئن شوید.' });
      return;
    }
    setIsLoading(true);
    setNotification(null);
    setReportData(null);

    // IMPORTANT: server expects Jalali format (jYYYY/jMM/jDD)
    const fromDateShamsi = moment(startDate).locale('en').format('jYYYY/jMM/jDD');
    const toDateShamsi = moment(endDate).locale('en').format('jYYYY/jMM/jDD');

    try {
      const res = await fetch(
        `/api/reports/sales-summary?fromDate=${fromDateShamsi}&toDate=${toDateShamsi}`,
        { headers: getAuthHeaders(token) }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت گزارش فروش و سود');
      setReportData(json.data);
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message || 'خطای نامشخص' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
  if (!token) return;
  const t = window.setTimeout(() => { fetchSalesReport(); }, 250);
  return () => window.clearTimeout(t);
}, [token, fromDate, toDate]);

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: string;
    bg?: string;
    tint?: string;
  }> = ({ title, value, icon, bg = 'bg-primary/5', tint = 'text-primary' }) => (
    <div className="rounded-xl p-5 bg-surface text-text border border-primary/10 shadow-sm dark:shadow-none">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">{title}</p>
          <p className="text-xl lg:text-2xl font-bold mt-1">
            {typeof value === 'number' ? formatPrice(value) : value}
          </p>
        </div>
        <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center`}>
          <i className={`${icon} ${tint}`} />
        </div>
      </div>
    </div>
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('itemName', { header: 'نام کالا/محصول' }),
      columnHelper.accessor('itemType', {
        header: 'نوع',
        cell: (info) => (info.getValue() === 'phone' ? 'گوشی موبایل' : 'کالای انبار'),
      }),
      columnHelper.accessor('quantitySold', {
        header: 'تعداد فروخته شده',
        cell: (info) => info.getValue().toLocaleString('fa-IR'),
      }),
      columnHelper.accessor('totalRevenue', {
        header: 'مجموع درآمد',
        cell: (info) => <span className="font-semibold text-indigo-700 dark:text-indigo-300">{formatPrice(info.getValue())}</span>,
      }),
    ],
    []
  );

  const table = useReactTable({
    data: reportData?.topSellingItems || [],
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } }, // صفحه‌بندی پیش‌فرض ۱۰تایی
  });

  const isDark = document.documentElement.classList.contains('dark');
  const axisColor = isDark ? '#9CA3AF' : '#6B7280';
  const gridColor = isDark ? '#334155' : '#e0e0e0';
  const tooltipBg = isDark ? '#0b1220' : '#ffffff';
  const tooltipBorder = isDark ? '#1f2937' : '#e0e0e0';
  const labelColor = isDark ? '#E5E7EB' : '#374151';

  return (
    <ProGate featureName="گزارش فروش و سود">
      <div className="report-page" dir="rtl">
        <Notification message={notification} onClose={() => setNotification(null)} />

      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs text-white/70">گزارشات • فروش</div>
              <h2 className="text-2xl font-extrabold mt-1">گزارش فروش و سود</h2>
              <div className="text-sm text-white/70 mt-1">تحلیل فروش، سود و روند روزانه در بازه انتخابی</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/15">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                نسخه حرفه‌ای
              </span>
            </div>
          </div>
        </div>
        <div className="p-6">
        

        {/* فیلترها */}
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 mb-6">
          <div className="w-full sm:w-auto">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">از تاریخ:</label>
            <ShamsiDatePicker
              selectedDate={startDate}
              onDateChange={setStartDate}
              inputClassName="w-full min-w-[220px] p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-white/10 dark:bg-black/30"
            />
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">تا تاریخ:</label>
            <ShamsiDatePicker
              selectedDate={endDate}
              onDateChange={(d) => setEndDate(d && startDate && d < startDate ? startDate : d)}
              inputClassName="w-full min-w-[220px] p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-white/10 dark:bg-black/30"
            />
          </div>
          <button
            onClick={fetchSalesReport}
            disabled={isLoading || !token}
            className="w-full lg:w-auto mt-1 lg:mt-0 px-5 py-3 rounded-xl bg-slate-900 text-white font-bold shadow-sm hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin ml-2" />
                درحال بارگذاری...
              </>
            ) : (
              'به‌روزرسانی گزارش'
            )}
          </button>
        </div>

        <div className="mb-6">
          <SavedViewsBar
            storageKey="app:savedViews:reports:sales:v1"
            currentState={{...savedViewState}}
            onApply={(st) => {{
              setStartDate(st.startDate ? new Date(st.startDate) : null);
              setEndDate(st.endDate ? new Date(st.endDate) : null);
            }}}
            label="بازه"
          />
        </div>

        {isLoading && !reportData && (
          <div className="p-10 text-center text-muted">
            <i className="fas fa-spinner fa-spin text-3xl mb-3" />
            <p>در حال بارگذاری گزارش...</p>
          </div>
        )}

        {!isLoading && !reportData && (
          <div className="p-10 text-center text-muted">
            <i className="fas fa-info-circle text-3xl mb-3" />
            <p>گزارشی برای نمایش وجود ندارد. بازه را انتخاب و «اعمال فیلتر» را بزنید.</p>
          </div>
        )}

        {reportData && (
          <div className="space-y-6">
            {/* کارت‌ها */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="مجموع درآمد" value={reportData.totalRevenue} icon="fa-solid fa-sack-dollar" />
              <StatCard title="سود ناخالص" value={reportData.grossProfit} icon="fa-solid fa-hand-holding-dollar" />
              <StatCard
                title="تعداد تراکنش‌ها"
                value={reportData.totalTransactions.toLocaleString('fa-IR')}
                icon="fa-solid fa-receipt"
              />
              <StatCard title="میانگین ارزش فروش" value={reportData.averageSaleValue} icon="fa-solid fa-calculator" />
            </div>

            {/* چارت */}
            {reportData.dailySales?.length ? (
              <div className="rounded-xl p-6 bg-surface border border-primary/10 shadow-sm dark:shadow-none">
                <h3 className="text-lg font-semibold mb-4">روند فروش روزانه</h3>
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reportData.dailySales} margin={{ top: 5, right: 0, left: 20, bottom: 20 }}>
                      <defs>
                        <linearGradient id="salesReportGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(t) => formatIsoToShamsi(t)}
                        tick={{ fontSize: 11, fill: axisColor }}
                        axisLine={{ stroke: gridColor }}
                        tickLine={{ stroke: gridColor }}
                        angle={-30}
                        textAnchor="end"
                        height={50}
                        interval={Math.max(0, Math.floor((reportData.dailySales.length || 1) / 10))}
                      />
                      <YAxis
                        orientation="right"
                        tick={{ fontSize: 12, fill: axisColor }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => Number(v).toLocaleString('fa-IR')}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: tooltipBg,
                          borderRadius: '8px',
                          border: `1px solid ${tooltipBorder}`,
                          direction: 'rtl',
                        }}
                        itemStyle={{ color: '#4F46E5' }}
                        labelStyle={{ color: labelColor, fontWeight: 'bold' }}
                        formatter={(v: number) => [formatPrice(v), 'فروش روز']}
                        labelFormatter={(l: string) => `تاریخ: ${formatIsoToShamsi(l)}`}
                      />
                      <Legend wrapperStyle={{ fontSize: 13, direction: 'rtl', color: axisColor }} />
                      <Line
                        type="monotone"
                        dataKey="totalSales"
                        stroke="#4F46E5"
                        fill="url(#salesReportGradient)"
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                        name="مجموع فروش روزانه"
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : null}

            {/* جدول کالاهای پرفروش */}
            {reportData.topSellingItems && (
              <div className="rounded-xl bg-surface text-text border border-primary/10 shadow-sm dark:shadow-none">
                <div className="p-6 border-b border-primary/10 flex justify-between items-center">
                  <h3 className="text-lg font-semibold">محصولات/کالاهای پرفروش (بر اساس درآمد)</h3>
                  <input
                    type="text"
                    placeholder="جستجو..."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="p-2 rounded-md text-sm border border-primary/20 bg-white dark:bg-black/30"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-primary/10 text-right text-sm">
                    <thead className="bg-primary/5">
                      {table.getHeaderGroups().map((hg) => (
                        <tr key={hg.id}>
                          {hg.headers.map((h) => (
                            <th key={h.id} className="px-6 py-3 font-semibold uppercase tracking-wider">
                              {flexRender(h.column.columnDef.header, h.getContext())}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800/60">
                      {table.getRowModel().rows.map((row) => (
                        <tr key={row.id} className="hover:bg-primary/5 transition-colors">
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-6 py-3">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {table.getPageCount() > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-primary/10 text-sm">
                    <div className="flex items-center gap-2">
                      <button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
                        «
                      </button>
                      <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                        ‹
                      </button>
                      <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                        ›
                      </button>
                      <button
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                      >
                        »
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>صفحه</span>
                      <strong>
                        {table.getState().pagination.pageIndex + 1} از {table.getPageCount()}
                      </strong>
                    </div>
                    <select
                      value={table.getState().pagination.pageSize}
                      onChange={(e) => table.setPageSize(Number(e.target.value))}
                      className="p-1 rounded border border-primary/20 bg-white dark:bg-black/30"
                    >
                      <option value="10">نمایش 10</option>
                      <option value="20">نمایش 20</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
    </ProGate>
  );
};

export default SalesReportPage;
