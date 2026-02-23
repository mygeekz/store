// pages/reports/AgingReceivablesReport.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageKit from '../../components/ui/PageKit';
import { apiFetch } from '../../utils/apiFetch';

type Bucket = { bucket: '0-30' | '31-60' | '61-90' | '90+'; amount: number; };
type Row = { customerId: number; fullName: string; phoneNumber?: string | null; totalOutstanding: number; buckets: Bucket[] };

const fmt = (n: number, digits = 0) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('fa-IR', { maximumFractionDigits: digits });

export default function AgingReceivablesReport() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setErr(null);
    try {
      const res = await apiFetch('/api/reports/aging-receivables');
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

  const totals = useMemo(() => {
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    for (const r of rows) {
      for (const b of r.buckets || []) {
        buckets[b.bucket] += b.amount || 0;
      }
    }
    const total = Object.values(buckets).reduce((a, b) => a + b, 0);
    return { total, buckets };
  }, [rows]);

  return (
    <PageKit
      title="Aging Receivables"
      subtitle="بدهی مشتریان در بازه‌های زمانی"
      icon={<i className="fa-solid fa-hourglass-half" />}
      backAction={() => navigate('/reports')}
      isLoading={isLoading}
      isEmpty={!isLoading && rows.length === 0}
      emptyTitle={err ? "خطا در دریافت گزارش" : "موردی پیدا نشد"}
      emptyDescription={err ? err : "هیچ بدهی فعالی ثبت نشده است."}
      emptyActionLabel="بازخوانی"
      onEmptyAction={load}
    >
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 md:col-span-1">
          <div className="text-xs text-muted">کل بدهی</div>
          <div className="mt-2 text-xl font-extrabold">{fmt(totals.total)}</div>
        </div>
        {(['0-30','31-60','61-90','90+'] as const).map(k => (
          <div key={k} className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
            <div className="text-xs text-muted">{k} روز</div>
            <div className="mt-2 text-xl font-extrabold">{fmt((totals.buckets as any)[k])}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5">
        <table className="min-w-full text-sm divide-y divide-black/10 dark:divide-white/10">
          <thead className="bg-black/[0.03] dark:bg-white/[0.03]">
            <tr>
              <th className="px-4 py-3 text-right font-semibold">مشتری</th>
              <th className="px-4 py-3 text-right font-semibold">موبایل</th>
              <th className="px-4 py-3 text-right font-semibold">۰-۳۰</th>
              <th className="px-4 py-3 text-right font-semibold">۳۱-۶۰</th>
              <th className="px-4 py-3 text-right font-semibold">۶۱-۹۰</th>
              <th className="px-4 py-3 text-right font-semibold">۹۰+</th>
              <th className="px-4 py-3 text-right font-semibold">جمع</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/10">
            {rows.map(r => {
              const map: any = {};
              for (const b of r.buckets || []) map[b.bucket] = b.amount;
              return (
                <tr key={r.customerId} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium">{r.fullName}</td>
                  <td className="px-4 py-3" dir="ltr">{r.phoneNumber || '-'}</td>
                  <td className="px-4 py-3">{fmt(map['0-30'] || 0)}</td>
                  <td className="px-4 py-3">{fmt(map['31-60'] || 0)}</td>
                  <td className="px-4 py-3">{fmt(map['61-90'] || 0)}</td>
                  <td className="px-4 py-3">{fmt(map['90+'] || 0)}</td>
                  <td className="px-4 py-3 font-bold">{fmt(r.totalOutstanding || 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PageKit>
  );
}
