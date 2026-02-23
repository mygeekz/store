// pages/reports/AbcAnalysisReport.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageKit from '../../components/ui/PageKit';
import { apiFetch } from '../../utils/apiFetch';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import moment from 'jalali-moment';

type Row = {
  productId: number;
  name: string;
  categoryName?: string | null;
  sales: number;
  cogs: number;
  profit: number;
  share: number;
  cumShare: number;
  bucket: 'A' | 'B' | 'C';
};

const toISODate = (d: Date) => d.toISOString().slice(0, 10);
const fmt = (n: number, digits = 0) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('fa-IR', { maximumFractionDigits: digits });

const BiLabel = ({ fa, en }: { fa: string; en: string }) => (
  <div className="leading-tight">
    <div className="text-xs font-semibold">{fa}</div>
    <div className="text-[11px] text-muted mt-0.5" dir="ltr">{en}</div>
  </div>
);

export default function AbcAnalysisReport() {
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState<Date>(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [toDate, setToDate] = useState<Date>(() => new Date());
  const [metric, setMetric] = useState<'sales' | 'profit'>('sales');
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fromISO = useMemo(() => toISODate(fromDate), [fromDate]);
  const toISO = useMemo(() => toISODate(toDate), [toDate]);

  const subtitle = useMemo(() => {
    const faRange = `${moment(fromDate).locale('fa').format('jYYYY/jMM/jDD')} تا ${moment(toDate).locale('fa').format('jYYYY/jMM/jDD')}`;
    const enMetric = metric === 'sales' ? 'Sales' : 'Profit';
    const faMetric = metric === 'sales' ? 'فروش' : 'سود';
    return `تحلیل ABC • بازه: ${faRange} • معیار: ${faMetric} (${enMetric})`;
  }, [fromDate, toDate, metric]);

  const load = async () => {
    setIsLoading(true);
    setErr(null);
    try {
      const res = await apiFetch(`/api/reports/abc?fromISO=${encodeURIComponent(fromISO)}&toISO=${encodeURIComponent(toISO)}&metric=${metric}`);
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت گزارش');
      setRows(json?.data || []);
    } catch (e: any) {
      setErr(e?.message || 'خطا در دریافت گزارش');
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
  const t = window.setTimeout(() => { void load(); }, 250);
  return () => window.clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [fromISO, toISO, metric]);

  const totals = useMemo(() => ({
    sales: rows.reduce((a, r) => a + (r.sales || 0), 0),
    profit: rows.reduce((a, r) => a + (r.profit || 0), 0),
  }), [rows]);

  return (
    <PageKit
      title="تحلیل ABC"
      subtitle={subtitle}
      icon={<i className="fa-solid fa-chart-pie" />}
      backAction={() => navigate('/reports')}
      isLoading={isLoading}
      isEmpty={!isLoading && rows.length === 0}
      emptyTitle={err ? "خطا در دریافت گزارش" : "موردی پیدا نشد"}
      emptyDescription={err ? err : "برای این بازه داده‌ای موجود نیست."}
      emptyActionLabel="بازخوانی"
      onEmptyAction={load}
      toolbarRight={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted">از</label>
            <div className="min-w-[180px]">
              <ShamsiDatePicker value={fromDate} onChange={(d: any) => d && setFromDate(d)} inputClassName="w-full h-10" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted">تا</label>
            <div className="min-w-[180px]">
              <ShamsiDatePicker value={toDate} onChange={(d: any) => d && setToDate(d)} inputClassName="w-full h-10" />
            </div>
          </div>
          <select value={metric} onChange={(e) => setMetric(e.target.value as any)} className="h-10 px-3 rounded-lg border bg-white/70 dark:bg-white/5 border-black/10 dark:border-white/10">
            <option value="sales">فروش (Sales)</option>
            <option value="profit">سود (Profit)</option>
          </select>
          <button onClick={load} className="h-10 px-4 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700">اعمال</button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
          <BiLabel fa="فروش کل" en="Total Sales" />
          <div className="mt-2 text-2xl font-extrabold">{fmt(totals.sales)}</div>
        </div>
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
          <BiLabel fa="سود کل" en="Total Profit" />
          <div className="mt-2 text-2xl font-extrabold">{fmt(totals.profit)}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5">
        <table className="min-w-full text-sm divide-y divide-black/10 dark:divide-white/10">
          <thead className="bg-black/[0.03] dark:bg-white/[0.03]">
            <tr>
              <th className="px-4 py-3 text-right"><BiLabel fa="کالا" en="Product" /></th>
              <th className="px-4 py-3 text-right"><BiLabel fa="دسته" en="Category" /></th>
              <th className="px-4 py-3 text-right"><BiLabel fa="گروه" en="Bucket" /></th>
              <th className="px-4 py-3 text-right"><BiLabel fa="فروش" en="Sales" /></th>
              <th className="px-4 py-3 text-right"><BiLabel fa="سود" en="Profit" /></th>
              <th className="px-4 py-3 text-right"><BiLabel fa="سهم" en="Share" /></th>
              <th className="px-4 py-3 text-right"><BiLabel fa="سهم تجمعی" en="Cumulative" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/10">
            {rows.map(r => (
              <tr key={r.productId} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-muted">{r.categoryName || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${r.bucket === 'A' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : r.bucket === 'B' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-slate-500/15 text-slate-700 dark:text-slate-300'}`}>
                    {r.bucket}
                  </span>
                </td>
                <td className="px-4 py-3">{fmt(r.sales)}</td>
                <td className="px-4 py-3">{fmt(r.profit)}</td>
                <td className="px-4 py-3">{fmt((r.share || 0) * 100, 1)}%</td>
                <td className="px-4 py-3">{fmt((r.cumShare || 0) * 100, 1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageKit>
  );
}
