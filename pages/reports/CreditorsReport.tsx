// pages/reports/CreditorsReport.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';

import Notification from '../../components/Notification';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthHeaders } from '../../utils/apiUtils';
import { CreditorReportItem, NotificationMessage } from '../../types';

const columnHelper = createColumnHelper<CreditorReportItem>();

function formatToman(value: number) {
  return value.toLocaleString('fa-IR') + ' تومان';
}

function initials(name: string) {
  const s = (name || '').trim();
  if (!s) return '؟';
  const parts = s.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || s[0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

const CreditorsReportPage: React.FC = () => {
  const { token } = useAuth();

  const [creditors, setCreditors] = useState<CreditorReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');

  const fetchCreditors = async () => {
    if (!token) return;
    setIsLoading(true);
    setNotification(null);
    try {
      const response = await fetch('/api/reports/creditors', { headers: getAuthHeaders(token) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت لیست بستانکاران');
      setCreditors(result.data || []);
    } catch (error) {
      setNotification({ type: 'error', text: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchCreditors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const stats = useMemo(() => {
    const items = creditors || [];
    const count = items.length;
    const total = items.reduce((a, b) => a + (Number(b.balance) || 0), 0);
    const max = items.reduce((m, x) => Math.max(m, Number(x.balance) || 0), 0);
    const avg = count ? Math.round(total / count) : 0;
    const top = [...items].sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0)).slice(0, 5);
    return { count, total, max, avg, top };
  }, [creditors]);

  const columns = useMemo(() => {
    return [
      columnHelper.accessor('partnerName', {
        header: 'همکار',
        cell: info => {
          const name = info.getValue() || '';
          const row = info.row.original;
          return (
            <div className="flex items-center gap-3 min-w-[220px]">
              <div className="h-10 w-10 rounded-2xl border border-slate-200 bg-white shadow-sm grid place-items-center text-slate-900 font-extrabold">
                {initials(name)}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-900 truncate">{name}</div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">
                  کد همکار: <span className="font-semibold">{row.id}</span>
                </div>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor('partnerType', {
        header: 'نوع',
        cell: info => (
          <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('balance', {
        header: 'مبلغ بستانکاری (بدهی ما)',
        cell: info => {
          const v = Number(info.getValue()) || 0;
          const pct = stats.max ? Math.min(100, Math.round((v / stats.max) * 100)) : 0;
          return (
            <div className="min-w-[260px]">
              <div className="flex items-baseline justify-between gap-3">
                <div className="font-extrabold text-rose-600 dark:text-rose-400">{formatToman(v)}</div>
                <div className="text-xs text-slate-500">(بدهی به همکار)</div>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                <div className="h-full rounded-full bg-rose-500" style={{ width: pct + '%' }} />
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor('id', {
        header: 'عملیات',
        cell: info => (
          <Link
            to={`/partners/${info.getValue()}`}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors text-sm font-bold shadow-sm"
          >
            <i className="fa-solid fa-user-tie" />
            جزئیات حساب
          </Link>
        ),
      }),
    ];
  }, [stats.max]);

  const table = useReactTable({
    data: creditors,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="report-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      {/* Premium Hero */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 sm:px-6 sm:py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-white/10 border border-white/15 grid place-items-center">
                  <i className="fa-solid fa-hand-holding-dollar text-lg" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-extrabold truncate">
                    گزارش همکاران بستانکار (طلبکار از ما)
                  </h2>
                  <div className="text-xs sm:text-sm text-white/70 mt-1">
                    تمرکز روی بدهی‌های پرداخت‌نشده به همکاران و بررسی سریع اولویت‌ها
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute right-3 top-1/2 -translate-y-1/2 text-white/60 text-sm" />
                <input
                  type="text"
                  placeholder="جستجو در نام / نوع..."
                  value={globalFilter}
                  onChange={e => setGlobalFilter(e.target.value)}
                  className="h-10 w-full sm:w-[320px] rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/50 pr-9 pl-3 outline-none focus:ring-2 focus:ring-white/25"
                />
              </div>

              <button
                onClick={fetchCreditors}
                disabled={isLoading || !token}
                className="h-10 inline-flex items-center justify-center gap-2 px-4 rounded-xl bg-white text-slate-900 font-extrabold hover:bg-white/95 disabled:opacity-60 transition shadow-sm"
              >
                <i className={`fas fa-rotate ${isLoading ? 'fa-spin' : ''}`} />
                به‌روزرسانی
              </button>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="text-xs text-slate-500">تعداد بستانکاران</div>
            <div className="mt-1 text-xl font-extrabold text-slate-900">
              {stats.count.toLocaleString('fa-IR')}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="text-xs text-slate-500">جمع بدهی</div>
            <div className="mt-1 text-xl font-extrabold text-rose-600">
              {formatToman(stats.total)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="text-xs text-slate-500">میانگین بدهی</div>
            <div className="mt-1 text-xl font-extrabold text-slate-900">
              {formatToman(stats.avg)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="text-xs text-slate-500">بیشترین بدهی</div>
            <div className="mt-1 text-xl font-extrabold text-slate-900">
              {formatToman(stats.max)}
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 + Table */}
      <div className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Top 5 */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center justify-between">
              <div className="font-extrabold text-slate-900">بالاترین بدهی‌ها</div>
              <span className="text-xs text-slate-500">Top 5</span>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {stats.top.length === 0 ? (
              <div className="text-sm text-slate-500 py-6 text-center">داده‌ای برای نمایش نیست.</div>
            ) : (
              stats.top.map((x, idx) => {
                const v = Number(x.balance) || 0;
                const pct = stats.max ? Math.min(100, Math.round((v / stats.max) * 100)) : 0;
                return (
                  <div key={x.id} className="rounded-2xl border border-slate-200 p-3 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-2xl bg-slate-900 text-white grid place-items-center font-extrabold text-sm">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">{x.partnerName}</div>
                          <div className="text-xs text-slate-500 truncate">{x.partnerType}</div>
                        </div>
                      </div>
                      <div className="text-sm font-extrabold text-rose-600 whitespace-nowrap">{formatToman(v)}</div>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                      <div className="h-full rounded-full bg-rose-500" style={{ width: pct + '%' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Table */}
        <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div className="font-extrabold text-slate-900">لیست بستانکاران</div>
            <div className="text-xs text-slate-500">
              {table.getFilteredRowModel().rows.length.toLocaleString('fa-IR')} مورد
            </div>
          </div>

          {isLoading ? (
            <div className="p-10 text-center text-slate-500">
              <i className="fas fa-spinner fa-spin text-3xl mb-3" />
              <p>در حال بارگذاری لیست بستانکاران...</p>
            </div>
          ) : creditors.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              <i className="fas fa-check-circle text-3xl text-emerald-500 mb-3" />
              <p>در حال حاضر هیچ همکار بستانکاری وجود ندارد.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    {table.getHeaderGroups().map(hg => (
                      <tr key={hg.id}>
                        {hg.headers.map(h => (
                          <th
                            key={h.id}
                            className="px-6 py-3 text-right font-extrabold text-slate-700 whitespace-nowrap"
                          >
                            {flexRender(h.column.columnDef.header, h.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {table.getRowModel().rows.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 transition">
                        {r.getVisibleCells().map(c => (
                          <td key={c.id} className="px-6 py-4 align-middle">
                            {flexRender(c.column.columnDef.cell, c.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {table.getPageCount() > 1 && (
                <div className="flex flex-col gap-3 sm:flex-row items-center justify-between p-4 border-t border-slate-200 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => table.setPageIndex(0)}
                      disabled={!table.getCanPreviousPage()}
                      className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                    >
                      «
                    </button>
                    <button
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                    >
                      ›
                    </button>
                    <button
                      onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                      disabled={!table.getCanNextPage()}
                      className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                    >
                      »
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-slate-600">
                    <span>صفحه</span>
                    <strong className="text-slate-900">
                      {table.getState().pagination.pageIndex + 1} از {table.getPageCount()}
                    </strong>
                  </div>

                  <select
                    value={table.getState().pagination.pageSize}
                    onChange={e => table.setPageSize(Number(e.target.value))}
                    className="h-9 px-3 border border-slate-200 rounded-xl bg-white"
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
    </div>
  );
};

export default CreditorsReportPage;
