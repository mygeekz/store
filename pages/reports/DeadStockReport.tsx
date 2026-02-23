// pages/reports/DeadStockReport.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageKit from '../../components/ui/PageKit';
import { apiFetch } from '../../utils/apiFetch';

type Row = {
  productId: number;
  name: string;
  categoryName?: string | null;
  stock: number;
  purchasePrice: number;
  value: number;
  lastSaleDate?: string | null;
  daysSinceLastSale?: number | null;
};

const fmt = (n: number, digits = 0) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('fa-IR', { maximumFractionDigits: digits });

export default function DeadStockReport() {
  const navigate = useNavigate();
  const [days, setDays] = useState(60);
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const subtitle = useMemo(() => `کالاهای بدون حرکت در ${days} روز اخیر`, [days]);

  const load = async () => {
    setIsLoading(true);
    setErr(null);
    try {
      const res = await apiFetch(`/api/reports/dead-stock?days=${encodeURIComponent(String(days))}`);
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

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, []);

  const totalValue = useMemo(() => rows.reduce((a, r) => a + (r.value || 0), 0), [rows]);

  return (
    <PageKit
      title="Dead Stock"
      subtitle={subtitle}
      icon={<i className="fa-solid fa-box-archive" />}
      backAction={() => navigate('/reports')}
      isLoading={isLoading}
      isEmpty={!isLoading && rows.length === 0}
      emptyTitle={err ? "خطا در دریافت گزارش" : "موردی پیدا نشد"}
      emptyDescription={err ? err : "در این بازه، کالای بدون حرکت پیدا نشد."}
      emptyActionLabel="بازخوانی"
      onEmptyAction={load}
      toolbarRight={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted">روز</label>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-10 px-3 rounded-lg border bg-white/70 dark:bg-white/5 border-black/10 dark:border-white/10">
              {[30, 60, 90, 120, 180].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button onClick={load} className="h-10 px-4 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700">اعمال</button>
        </div>
      }
    >
      <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 mb-4">
        <div className="text-xs text-muted">ارزش کل موجودی Dead Stock</div>
        <div className="mt-2 text-2xl font-extrabold">{fmt(totalValue)}</div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5">
        <table className="min-w-full text-sm divide-y divide-black/10 dark:divide-white/10">
          <thead className="bg-black/[0.03] dark:bg-white/[0.03]">
            <tr>
              <th className="px-4 py-3 text-right font-semibold">کالا</th>
              <th className="px-4 py-3 text-right font-semibold">دسته</th>
              <th className="px-4 py-3 text-right font-semibold">موجودی</th>
              <th className="px-4 py-3 text-right font-semibold">ارزش</th>
              <th className="px-4 py-3 text-right font-semibold">آخرین فروش</th>
              <th className="px-4 py-3 text-right font-semibold">روزهای گذشته</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/10">
            {rows.map(r => (
              <tr key={r.productId} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-muted">{r.categoryName || '-'}</td>
                <td className="px-4 py-3">{fmt(r.stock)}</td>
                <td className="px-4 py-3">{fmt(r.value)}</td>
                <td className="px-4 py-3">{r.lastSaleDate ? String(r.lastSaleDate).slice(0,10) : '-'}</td>
                <td className="px-4 py-3">{r.daysSinceLastSale ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageKit>
  );
}
