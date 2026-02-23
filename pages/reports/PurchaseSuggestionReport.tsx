// pages/reports/PurchaseSuggestionReport.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { PurchaseSuggestionItem, NotificationMessage } from '../../types';
import Notification from '../../components/Notification';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../utils/apiFetch';

import ModernReportShell from '../../components/reports/ModernReportShell';
import ModernKpiCard from '../../components/reports/ModernKpiCard';
import ModernTableTools from '../../components/reports/ModernTableTools';

const columnHelper = createColumnHelper<PurchaseSuggestionItem>();
const fmt = (num: number, digits = 0) =>
  (num ?? 0).toLocaleString('fa-IR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

function downloadCsv(filename: string, rows: Record<string, any>[]) {
  const headers = Object.keys(rows[0] || {});
  const escape = (s: any) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type Urgency = 'all' | 'urgent' | 'soon';

const PurchaseSuggestionReport: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<PurchaseSuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [search, setSearch] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('all');

  useEffect(() => {
    if (currentUser && currentUser.roleName === 'Salesperson') {
      setNotification({ type: 'error', text: 'شما اجازه دسترسی به این صفحه را ندارید.' });
      navigate('/reports/analysis');
      return;
    }

    const fetchReport = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch('/api/analysis/purchase-suggestions');
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت پیشنهادهای خرید');
        setData(json.data || []);
      } catch (e: any) {
        setNotification({ type: 'error', text: e.message || 'خطای نامشخص' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [currentUser, navigate]);

  const filteredData = useMemo(() => {
    if (urgency === 'all') return data;
    if (urgency === 'urgent') return data.filter((x) => (x.daysOfStockLeft ?? 9999) <= 7);
    return data.filter((x) => (x.daysOfStockLeft ?? 9999) > 7 && (x.daysOfStockLeft ?? 9999) <= 14);
  }, [data, urgency]);

  const totals = useMemo(() => {
    const urgent = data.filter((x) => (x.daysOfStockLeft ?? 9999) <= 7).length;
    const soon = data.filter((x) => (x.daysOfStockLeft ?? 9999) > 7 && (x.daysOfStockLeft ?? 9999) <= 14).length;
    const sumSuggested = data.reduce((s, x) => s + (x.suggestedPurchaseQuantity ?? 0), 0);
    const avgDays = data.length ? data.reduce((s, x) => s + (x.daysOfStockLeft ?? 0), 0) / data.length : 0;
    return { urgent, soon, sumSuggested, avgDays, count: data.length };
  }, [data]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('itemName', {
        header: 'کالا/محصول',
        cell: (info) => <span className="font-semibold text-slate-900 dark:text-slate-100">{info.getValue()}</span>,
      }),
      columnHelper.accessor('currentStock', {
        header: 'موجودی',
        cell: (info) => fmt(info.getValue(), 0),
      }),
      columnHelper.accessor('salesPerDay', {
        header: 'سرعت فروش (روزانه)',
        cell: (info) => fmt(info.getValue(), 2),
      }),
      columnHelper.accessor('daysOfStockLeft', {
        header: 'روز باقی‌مانده',
        cell: (info) => {
          const v = info.getValue() ?? 0;
          const cls =
            v <= 7
              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-200'
              : v <= 14
              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200';
          return <span className={`rounded-full px-2 py-1 text-xs font-bold ${cls}`}>{fmt(v, 0)}</span>;
        },
      }),
      columnHelper.accessor('suggestedPurchaseQuantity', {
        header: 'تعداد پیشنهادی خرید',
        cell: (info) => <span className="font-extrabold text-primary-700 dark:text-primary-300">{fmt(info.getValue(), 0)}</span>,
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { globalFilter: search },
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue ?? '').trim();
      if (!q) return true;
      return String(row.original.itemName ?? '').includes(q);
    },
  });

  const handleExport = () => {
    const out = table.getFilteredRowModel().rows.map((r) => r.original);
    if (!out.length) return;
    downloadCsv('purchase_suggestions.csv', out.map((x) => ({
      itemName: x.itemName,
      currentStock: x.currentStock,
      salesPerDay: x.salesPerDay,
      daysOfStockLeft: x.daysOfStockLeft,
      suggestedPurchaseQuantity: x.suggestedPurchaseQuantity,
      itemType: x.itemType,
    })));
  };

  const handlePrint = () => window.print();

  const Chip = ({ k, label, tone }: { k: Urgency; label: string; tone: string }) => (
    <button
      onClick={() => setUrgency(k)}
      className={[
        'h-10 rounded-xl px-3 text-sm font-extrabold transition',
        urgency === k
          ? `bg-gradient-to-br ${tone} text-white shadow-md`
          : 'border border-slate-200/70 bg-white/70 text-slate-700 shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100',
      ].join(' ')}
    >
      {label}
    </button>
  );

  if (currentUser && currentUser.roleName === 'Salesperson') return null;

  return (
    <div className="report-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <ModernReportShell
        title="پیشنهادهای هوشمند خرید"
        subtitle="لیست کالاهای رو به اتمام، اولویت‌بندی شده بر اساس سرعت فروش و روزهای باقی‌مانده از موجودی."
        icon="fa-solid fa-lightbulb"
        actions={
          <button
            onClick={() => navigate('/reports/analysis')}
            className="h-10 rounded-xl border border-slate-200/70 bg-white/80 px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          >
            <i className="fa-solid fa-arrow-right ml-2" />
            بازگشت
          </button>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ModernKpiCard label="تعداد آیتم" value={fmt(totals.count)} icon="fa-solid fa-list-check" />
          <ModernKpiCard label="فوری (≤ ۷ روز)" value={fmt(totals.urgent)} icon="fa-solid fa-triangle-exclamation" />
          <ModernKpiCard label="به‌زودی (۸ تا ۱۴)" value={fmt(totals.soon)} icon="fa-solid fa-clock" />
          <ModernKpiCard label="جمع خرید پیشنهادی" value={fmt(totals.sumSuggested)} icon="fa-solid fa-cart-plus" hint={`میانگین روز باقی‌مانده: ${fmt(totals.avgDays, 1)}`} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Chip k="all" label="همه" tone="from-slate-700 to-slate-900" />
          <Chip k="urgent" label="فوری" tone="from-rose-500 to-orange-500" />
          <Chip k="soon" label="به‌زودی" tone="from-amber-500 to-orange-500" />
        </div>

        <div className="mt-3">
          <ModernTableTools
            search={search}
            onSearch={setSearch}
            onExportCsv={handleExport}
            onPrint={handlePrint}
            placeholder="جستجو در نام کالا..."
            right={
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <i className="fa-solid fa-filter" />
                {table.getFilteredRowModel().rows.length.toLocaleString('fa-IR')} ردیف
              </div>
            }
          />
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-slate-950/40">
          {isLoading ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-300">در حال بارگذاری…</div>
          ) : filteredData.length === 0 ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-300">
              موردی برای نمایش وجود ندارد. (ممکن است موجودی‌ها کامل باشند یا داده کافی نباشد.)
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-700 dark:bg-white/5 dark:text-slate-200">
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className="border-b border-slate-200/70 dark:border-white/10">
                      {hg.headers.map((h) => (
                        <th key={h.id} className="whitespace-nowrap px-4 py-3 text-right font-bold">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-white/5">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-200">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {filteredData.length > 0 ? (
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              صفحه {(table.getState().pagination.pageIndex + 1).toLocaleString('fa-IR')} از {table.getPageCount().toLocaleString('fa-IR')}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-10 rounded-xl border border-slate-200/70 bg-white/80 px-3 text-sm font-semibold text-slate-700 shadow-sm disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              >
                قبلی
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-10 rounded-xl border border-slate-200/70 bg-white/80 px-3 text-sm font-semibold text-slate-700 shadow-sm disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              >
                بعدی
              </button>
            </div>
          </div>
        ) : null}
      </ModernReportShell>
    </div>
  );
};

export default PurchaseSuggestionReport;
