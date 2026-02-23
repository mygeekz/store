// pages/reports/InventoryTurnoverReport.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'jalali-moment';
import PageKit from '../../components/ui/PageKit';
import { apiFetch } from '../../utils/apiFetch';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';

type Data = {
  periodDays: number;
  cogs: number;
  avgInventoryValue: number;
  inventoryTurnover: number;
  daysOfInventory: number;
};

const toISODate = (d: Date) => d.toISOString().slice(0, 10);
const toJalali = (d: Date) => moment(d).locale('fa').format('jYYYY/jMM/jDD');

const fmt = (n: number, digits = 0) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('fa-IR', { maximumFractionDigits: digits });

export default function InventoryTurnoverReport() {
  const navigate = useNavigate();

  const [fromDate, setFromDate] = useState<Date>(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [toDate, setToDate] = useState<Date>(() => new Date());

  const [data, setData] = useState<Data | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const subtitle = useMemo(() => `بازه: ${toJalali(fromDate)} تا ${toJalali(toDate)}`, [fromDate, toDate]);

  const load = async () => {
    setIsLoading(true);
    setErr(null);
    try {
      const fromISO = toISODate(fromDate);
      const toISO = toISODate(toDate);

      const res = await apiFetch(
        `/api/reports/inventory-turnover?fromISO=${encodeURIComponent(fromISO)}&toISO=${encodeURIComponent(toISO)}`
      );
      const json = await res.json();

      if (!res.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت گزارش');
      setData(json.data as Data);
    } catch (e: any) {
      setErr(e?.message || 'خطا در دریافت گزارش');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
  const t = window.setTimeout(() => { void load(); }, 250);
  return () => window.clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [fromDate, toDate]);

  return (
    <PageKit
      title="گردش موجودی"
      subtitle={subtitle}
      icon={<i className="fa-solid fa-rotate" />}
      backAction={() => navigate('/reports')}
      isLoading={isLoading}
      isEmpty={!isLoading && !data}
      emptyTitle={err ? 'خطا در دریافت گزارش' : 'داده‌ای برای نمایش نیست'}
      emptyDescription={err ? err : 'بازه زمانی را تغییر بده و دوباره تلاش کن.'}
      emptyActionLabel="بازخوانی"
      onEmptyAction={load}
      toolbarRight={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">از</span>
            <div className="min-w-[180px]">
              <ShamsiDatePicker value={fromDate} onChange={(d: any) => d && setFromDate(d)} inputClassName="w-full h-11" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">تا</span>
            <div className="min-w-[180px]">
              <ShamsiDatePicker value={toDate} onChange={(d: any) => d && setToDate(d)} inputClassName="w-full h-11" />
            </div>
          </div>

          <button
            onClick={load}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition shadow-sm"
          >
            <i className={`fa-solid fa-bolt ${isLoading ? 'fa-fade' : ''}`} />
            اعمال
          </button>
        </div>
      }
    >
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
            <div className="leading-tight">
              <div className="text-xs font-semibold">هزینه کالای فروش‌رفته</div>
              <div className="text-[11px] text-muted mt-0.5" dir="ltr">COGS</div>
            </div>
            <div className="mt-2 text-2xl font-extrabold">{fmt(data.cogs)}</div>
          </div>
          <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
            <div className="leading-tight">
              <div className="text-xs font-semibold">میانگین ارزش موجودی</div>
              <div className="text-[11px] text-muted mt-0.5" dir="ltr">Average Inventory Value</div>
            </div>
            <div className="mt-2 text-2xl font-extrabold">{fmt(data.avgInventoryValue)}</div>
          </div>
          <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
            <div className="leading-tight">
              <div className="text-xs font-semibold">گردش موجودی</div>
              <div className="text-[11px] text-muted mt-0.5" dir="ltr">Inventory Turnover</div>
            </div>
            <div className="mt-2 text-2xl font-extrabold">{fmt(data.inventoryTurnover, 2)}</div>
          </div>
          <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
            <div className="leading-tight">
              <div className="text-xs font-semibold">روزهای موجودی</div>
              <div className="text-[11px] text-muted mt-0.5" dir="ltr">Days of Inventory</div>
            </div>
            <div className="mt-2 text-2xl font-extrabold">{fmt(data.daysOfInventory, 1)}</div>
          </div>
        </div>
      )}
    </PageKit>
  );
}
