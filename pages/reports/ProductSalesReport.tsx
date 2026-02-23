import React, {useEffect, useMemo, useRef, useState} from 'react';
import moment from 'jalali-moment';
import PageKit from '../../components/ui/PageKit';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import Notification from '../../components/Notification';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../utils/apiFetch';
import { exportToExcel } from '../../utils/exporters';
import type { NotificationMessage } from '../../types';


import { useReportsExports } from '../../contexts/ReportsExportsContext';

type Row = {
  orderId: number;
  transactionDate: string;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPerItem: number;
  lineTotal: number;
};

const toShamsiStr = (d: Date) => moment(d).locale('en').format('jYYYY/jMM/jDD');
const money = (n: number) => (n ?? 0).toLocaleString('fa-IR') + ' تومان';

export default function ProductSalesReport() {
  const { token } = useAuth();
  const { registerReportExports } = useReportsExports();

  const monthStart = useMemo(() => moment().locale('fa').startOf('jMonth').toDate(), []);
  const monthEnd = useMemo(() => moment().locale('fa').endOf('jMonth').toDate(), []);

  const [fromDate, setFromDate] = useState<Date | null>(monthStart);
  const [toDate, setToDate] = useState<Date | null>(monthEnd);

  const [query, setQuery] = useState('');

  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const filteredRows = useMemo(() => {
  // registerReportExports از ReportsExportsContext گرفته می‌شود
  const exportExcelRef = useRef<() => void>(() => {});

    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      String(r.orderId).includes(q) ||
      String(r.productId).includes(q) ||
      (r.productName || '').toLowerCase().includes(q)
    );
  }, [rows, query]);

  const topProducts = useMemo(() => {
    const m = new Map<number, { productId: number; productName: string; qty: number; amount: number }>();
    for (const r of filteredRows) {
      const cur = m.get(r.productId) || { productId: r.productId, productName: r.productName, qty: 0, amount: 0 };
      cur.qty += Number(r.quantity || 0);
      cur.amount += Number(r.lineTotal || 0);
      m.set(r.productId, cur);
    }
    return Array.from(m.values()).sort((a,b) => b.amount - a.amount).slice(0, 8);
  }, [filteredRows]);

  const filteredTotal = useMemo(() => filteredRows.reduce((s,r)=>s+Number(r.lineTotal||0),0), [filteredRows]);

  const from = fromDate ? toShamsiStr(fromDate) : undefined;
  const to = toDate ? toShamsiStr(toDate) : undefined;

  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    setNotification(null);

    try {
      const res = await apiFetch(`/api/reports/product-sales/details?from=${encodeURIComponent(from || '')}&to=${encodeURIComponent(to || '')}`);
      const js = await res.json();
      if (!res.ok || js?.success === false) {
        throw new Error(js?.message || 'خطا در دریافت گزارش');
      }
      const list = (js?.data?.rows || []) as Row[];
      setRows(list);

      const t = list.reduce((sum, r) => sum + Number(r.lineTotal || 0), 0);
      setTotal(Number.isFinite(t) ? t : 0);
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
  if (!token) return;
  const t = window.setTimeout(() => { fetchData(); }, 250);
  return () => window.clearTimeout(t);
}, [token, fromDate, toDate]);

  const exportExcel = () => {
    const out = rows.map((r) => ({
      date: r.transactionDate,
      orderId: r.orderId,
      productId: r.productId,
      productName: r.productName,
      quantity: r.quantity,
      unitPrice: r.unitPrice,
      discountPerItem: r.discountPerItem,
      lineTotal: r.lineTotal,
    }));

    exportToExcel(
      `product-sales-${new Date().toISOString().slice(0, 10)}.xlsx`,
      out,
      [
        { header: 'تاریخ', key: 'date' },
        { header: 'شناسه فاکتور', key: 'orderId' },
        { header: 'شناسه محصول', key: 'productId' },
        { header: 'نام محصول', key: 'productName' },
        { header: 'تعداد', key: 'quantity' },
        { header: 'قیمت واحد', key: 'unitPrice' },
        { header: 'تخفیف آیتم', key: 'discountPerItem' },
        { header: 'جمع سطر', key: 'lineTotal' },
      ],
    );
  };

  // اتصال دکمه Excel بالای ReportsLayout به خروجی دقیق همین صفحه
  exportExcelRef.current = exportExcel;
  useEffect(() => {
    registerReportExports({ excel: () => exportExcelRef.current() });
    return () => registerReportExports({});
  }, [registerReportExports]);


return (
  <div dir="rtl">
    <Notification message={notification} onClose={() => setNotification(null)} />

    <PageKit
      title="گزارش فروش محصولات (بدون گوشی)"
      subtitle="فقط اقلام انبار (Inventory) از فاکتورها — فروش موبایل نقدی/اقساطی محاسبه نمی‌شود."
      icon={<i className="fa-solid fa-boxes-stacked" />}
      query={query}
      onQueryChange={setQuery}
      searchPlaceholder="جستجو در محصول / شناسه محصول / شناسه فاکتور…"
      toolbarRight={
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-52">
            <ShamsiDatePicker
              selectedDate={fromDate}
              onChange={setFromDate}
              placeholder="از تاریخ"
              inputClassName="h-10 w-full px-3 rounded-xl border bg-white/70 dark:bg-white/5 border-black/10 dark:border-white/10"
            />
          </div>
          <div className="w-52">
            <ShamsiDatePicker
              selectedDate={toDate}
              onChange={setToDate}
              placeholder="تا تاریخ"
              inputClassName="h-10 w-full px-3 rounded-xl border bg-white/70 dark:bg-white/5 border-black/10 dark:border-white/10"
            />
          </div>

          <button
            onClick={fetchData}
            className="h-10 px-4 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 active:scale-[0.99] transition shadow-sm"
            disabled={isLoading}
            type="button"
          >
            <span className="me-2">↻</span>
            به‌روزرسانی
          </button>

          <button
            onClick={exportExcel}
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold active:scale-[0.99] transition shadow-sm disabled:opacity-50"
            disabled={filteredRows.length === 0}
            type="button"
          >
            <span className="me-2">⬇</span>
            خروجی Excel
          </button>
        </div>
      }
      isLoading={isLoading}
      isEmpty={!isLoading && filteredRows.length === 0}
      emptyTitle="داده‌ای برای نمایش نیست"
      emptyDescription="بازه زمانی را تغییر بده یا جستجو را پاک کن و دوباره تلاش کن."
      emptyActionLabel="بازخوانی"
      onEmptyAction={fetchData}
    >
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">تعداد ردیف</div>
          <div className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-gray-100">{filteredRows.length.toLocaleString('fa-IR')}</div>
        </div>
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">مبلغ کل (فیلتر فعلی)</div>
          <div className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-gray-100">{money(filteredTotal)}</div>
        </div>
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">مبلغ کل (کل بازه)</div>
          <div className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-gray-100">{money(total)}</div>
        </div>
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">بازه انتخابی</div>
          <div className="mt-2 text-base font-bold text-gray-900 dark:text-gray-100">
            {fromDate ? toShamsiStr(fromDate) : '—'} تا {toDate ? toShamsiStr(toDate) : '—'}
          </div>
        </div>
      </div>

      {/* Top products */}
      <div className="mt-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5">
        <div className="px-4 py-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <div className="font-extrabold text-gray-900 dark:text-gray-100">پرفروش‌ترین‌ها</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">بر اساس مبلغ</div>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {topProducts.map((p, idx) => (
            <div key={p.productId} className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-3">
              <div className="flex items-start gap-2">
                <div className="h-9 w-9 rounded-xl bg-slate-900 text-white grid place-items-center font-extrabold">
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-gray-900 dark:text-gray-100 truncate">{p.productName}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    کد: {String(p.productId).toLocaleString('fa-IR')} • تعداد: {String(p.qty).toLocaleString('fa-IR')}
                  </div>
                </div>
              </div>
              <div className="mt-2 font-extrabold text-gray-900 dark:text-gray-100">{money(p.amount)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      {filteredRows.length > 0 && (
        <div className="mt-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
            <div className="font-extrabold text-gray-900 dark:text-gray-100">جزئیات فروش</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{filteredRows.length.toLocaleString('fa-IR')} ردیف</div>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/40 text-gray-700 dark:text-gray-200 sticky top-0">
                <tr>
                  <th className="p-3 text-right whitespace-nowrap">تاریخ</th>
                  <th className="p-3 text-right whitespace-nowrap">فاکتور</th>
                  <th className="p-3 text-right whitespace-nowrap">کد کالا</th>
                  <th className="p-3 text-right whitespace-nowrap">نام کالا</th>
                  <th className="p-3 text-right whitespace-nowrap">تعداد</th>
                  <th className="p-3 text-right whitespace-nowrap">قیمت واحد</th>
                  <th className="p-3 text-right whitespace-nowrap">تخفیف</th>
                  <th className="p-3 text-right whitespace-nowrap">جمع</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => (
                  <tr key={i} className="border-t border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition">
                    <td className="p-3 text-gray-700 dark:text-gray-200 whitespace-nowrap">{r.transactionDate}</td>
                    <td className="p-3 text-gray-700 dark:text-gray-200 whitespace-nowrap">{String(r.orderId).toLocaleString('fa-IR')}</td>
                    <td className="p-3 text-gray-700 dark:text-gray-200 whitespace-nowrap">{String(r.productId).toLocaleString('fa-IR')}</td>
                    <td className="p-3 font-semibold text-gray-900 dark:text-gray-100 min-w-[260px]">{r.productName}</td>
                    <td className="p-3 text-gray-700 dark:text-gray-200 whitespace-nowrap">{String(r.quantity).toLocaleString('fa-IR')}</td>
                    <td className="p-3 text-gray-700 dark:text-gray-200 whitespace-nowrap">{money(Number(r.unitPrice || 0))}</td>
                    <td className="p-3 text-gray-700 dark:text-gray-200 whitespace-nowrap">{money(Number(r.discountPerItem || 0))}</td>
                    <td className="p-3 font-extrabold text-gray-900 dark:text-gray-100 whitespace-nowrap">{money(Number(r.lineTotal || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageKit>
  </div>
);
}
