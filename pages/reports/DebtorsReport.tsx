// pages/reports/DebtorsReport.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DebtorReportItem, NotificationMessage } from '../../types';
import Notification from '../../components/Notification';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthHeaders } from '../../utils/apiUtils';
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';

const columnHelper = createColumnHelper<DebtorReportItem>();

const money = (n: number) => n.toLocaleString('fa-IR') + ' تومان';

const DebtorsReportPage: React.FC = () => {
  const { token } = useAuth();
  const [debtors, setDebtors] = useState<DebtorReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');

  const fetchDebtors = async () => {
    if (!token) return;
    setIsLoading(true);
    setNotification(null);
    try {
      const response = await fetch('/api/reports/debtors', { headers: getAuthHeaders(token) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت لیست بدهکاران');
      setDebtors(result.data || []);
    } catch (error) {
      setNotification({ type: 'error', text: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDebtors();
  }, [token]);

  const totalDebt = useMemo(() => debtors.reduce((acc, d) => acc + (Number(d.balance) || 0), 0), [debtors]);
  const maxDebt = useMemo(() => Math.max(0, ...debtors.map(d => Number(d.balance) || 0)), [debtors]);
  const avgDebt = useMemo(() => (debtors.length ? Math.round(totalDebt / debtors.length) : 0), [debtors, totalDebt]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('fullName', {
        header: 'مشتری',
        cell: (info) => {
          const name = info.getValue() || '-';
          const first = String(name).trim().charAt(0) || '؟';
          return (
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-2xl bg-primary/10 border border-primary/15 grid place-items-center font-extrabold text-primary">
                {first}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-text truncate">{name}</div>
                <div className="text-xs text-muted">حساب مشتری</div>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor('phoneNumber', {
        header: 'شماره تماس',
        cell: (info) => (
          <span className="text-text">{info.getValue() ? String(info.getValue()) : '—'}</span>
        ),
      }),
      columnHelper.accessor('balance', {
        header: 'مبلغ بدهی',
        cell: (info) => {
          const v = Number(info.getValue()) || 0;
          const pct = maxDebt ? Math.min(100, Math.round((v / maxDebt) * 100)) : 0;
          return (
            <div className="min-w-[220px]">
              <div className="flex items-baseline justify-between">
                <span className="font-extrabold text-rose-600 dark:text-rose-400">{money(v)}</span>
                <span className="text-xs text-muted">بدهکار</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                <div className="h-full bg-rose-500/70" style={{ width: pct + '%' }} />
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor('id', {
        header: 'عملیات',
        cell: (info) => (
          <Link
            to={`/customers/${info.getValue()}`}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition shadow-sm"
          >
            <i className="fa-solid fa-user" />
            جزئیات حساب
          </Link>
        ),
      }),
    ],
    [maxDebt]
  );

  const table = useReactTable({
    data: debtors,
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

      {/* Hero */}
      <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-rose-500/10 via-white/60 to-white dark:from-rose-500/20 dark:via-white/5 dark:to-white/0 p-5 md:p-6 shadow-sm dark:shadow-none">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-11 w-11 rounded-2xl bg-rose-500/10 border border-rose-500/15 flex items-center justify-center">
                <i className="fa-solid fa-triangle-exclamation text-rose-600 dark:text-rose-300" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl md:text-2xl font-extrabold text-text truncate">گزارش مشتریان بدهکار</h2>
                <p className="text-sm text-muted mt-0.5">لیست بدهکاران به همراه مبلغ بدهی و دسترسی سریع به جزئیات حساب</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/#/reports"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition shadow-sm"
            >
              <i className="fa-solid fa-arrow-right" />
              بازگشت به لیست
            </Link>
            <button
              onClick={fetchDebtors}
              disabled={isLoading || !token}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-60 transition shadow-sm"
            >
              <i className={`fas fa-rotate ${isLoading ? 'fa-spin' : ''}`} />
              به‌روزرسانی
            </button>
          </div>
        </div>

        {/* KPI */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-primary/10 bg-white/70 dark:bg-white/5 p-4">
            <div className="text-xs text-muted">تعداد بدهکاران</div>
            <div className="mt-2 text-2xl font-extrabold text-text">{debtors.length.toLocaleString('fa-IR')}</div>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-white/70 dark:bg-white/5 p-4">
            <div className="text-xs text-muted">جمع بدهی</div>
            <div className="mt-2 text-2xl font-extrabold text-text">{money(totalDebt)}</div>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-white/70 dark:bg-white/5 p-4">
            <div className="text-xs text-muted">میانگین بدهی</div>
            <div className="mt-2 text-2xl font-extrabold text-text">{money(avgDebt)}</div>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-white/70 dark:bg-white/5 p-4">
            <div className="text-xs text-muted">بیشترین بدهی</div>
            <div className="mt-2 text-2xl font-extrabold text-text">{money(maxDebt)}</div>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <i className="fa-solid fa-magnifying-glass absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="جستجو در بدهکاران…"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="h-11 w-full pr-10 pl-3 rounded-2xl border border-primary/10 bg-white/80 dark:bg-white/5 text-text placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="text-xs text-muted">نتیجه: {table.getFilteredRowModel().rows.length.toLocaleString('fa-IR')} نفر</div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 rounded-2xl border border-primary/10 bg-white/70 dark:bg-white/5 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted">
            <i className="fas fa-spinner fa-spin text-3xl mb-3" />
            <p>در حال بارگذاری لیست بدهکاران…</p>
          </div>
        ) : debtors.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <i className="fas fa-check-circle text-3xl text-emerald-500 mb-3" />
            <p>در حال حاضر هیچ مشتری بدهکاری وجود ندارد.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-primary/5">
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      {hg.headers.map((h) => (
                        <th key={h.id} className="px-6 py-3 text-right font-extrabold text-text whitespace-nowrap">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {table.getRowModel().rows.map((r, idx) => (
                    <tr key={r.id} className={idx % 2 ? 'bg-white/40 dark:bg-white/0' : ''}>
                      {r.getVisibleCells().map((c) => (
                        <td key={c.id} className="px-6 py-4 align-middle whitespace-nowrap">
                          {flexRender(c.column.columnDef.cell, c.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {table.getPageCount() > 1 && (
              <div className="flex flex-col gap-3 sm:flex-row items-center justify-between p-4 border-t border-primary/10 text-sm">
                <div className="text-xs text-muted">
                  صفحه {table.getState().pagination.pageIndex + 1} از {table.getPageCount().toLocaleString('fa-IR')}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                    className="h-9 px-3 rounded-xl border border-primary/15 bg-white/70 dark:bg-white/5 disabled:opacity-50"
                  >
                    «
                  </button>
                  <button
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="h-9 px-3 rounded-xl border border-primary/15 bg-white/70 dark:bg-white/5 disabled:opacity-50"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="h-9 px-3 rounded-xl border border-primary/15 bg-white/70 dark:bg-white/5 disabled:opacity-50"
                  >
                    ›
                  </button>
                  <button
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                    className="h-9 px-3 rounded-xl border border-primary/15 bg-white/70 dark:bg-white/5 disabled:opacity-50"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DebtorsReportPage;
