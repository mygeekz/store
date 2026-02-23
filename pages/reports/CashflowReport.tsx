// pages/reports/CashflowReport.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'jalali-moment';
import PageKit from '../../components/ui/PageKit';
import { apiFetch } from '../../utils/apiFetch';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type Day = { date: string; inflow: number; outflow: number; net: number };
type Totals = { inflow: number; outflow: number; net: number };
type Data = { days: Day[]; forecast: Day[]; totals: Totals };

const toISODate = (d: Date) => d.toISOString().slice(0, 10);
const toJalali = (d: Date) => moment(d).locale('fa').format('jYYYY/jMM/jDD');
const fmt = (n: number, digits = 0) => (Number.isFinite(n) ? n : 0).toLocaleString('fa-IR', { maximumFractionDigits: digits });

export default function CashflowReport() {
  const navigate = useNavigate();

  const [fromDate, setFromDate] = useState<Date>(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [toDate, setToDate] = useState<Date>(() => new Date());
  const [forecastDays, setForecastDays] = useState<number>(30);

  const [data, setData] = useState<Data | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const subtitle = useMemo(() => `بازه: ${toJalali(fromDate)} تا ${toJalali(toDate)} • پیش‌بینی: ${forecastDays} روز`, [fromDate, toDate, forecastDays]);

  const load = async () => {
    setIsLoading(true);
    setErr(null);
    try {
      const fromISO = toISODate(fromDate);
      const toISO = toISODate(toDate);

      const res = await apiFetch(
        `/api/reports/cashflow?fromISO=${encodeURIComponent(fromISO)}&toISO=${encodeURIComponent(toISO)}&forecastDays=${encodeURIComponent(String(forecastDays))}`
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
}, [fromDate, toDate, forecastDays]);

  const chartData = useMemo(() => {
    const base = data?.days || [];
    return base.map(d => ({
      ...d,
      label: moment(d.date).locale('fa').format('jMM/jDD'),
    }));
  }, [data]);

  const forecastChartData = useMemo(() => {
    const f = data?.forecast || [];
    return f.map(d => ({
      ...d,
      label: moment(d.date).locale('fa').format('jMM/jDD'),
    }));
  }, [data]);

  return (
    <PageKit
      title="جریان نقدی"
      subtitle={subtitle}
      icon={<i className="fa-solid fa-money-bill-trend-up" />}
      backAction={() => navigate('/reports')}
      isLoading={isLoading}
      isEmpty={!isLoading && !data}
      emptyTitle={err ? "خطا در دریافت گزارش" : "داده‌ای برای نمایش نیست"}
      emptyDescription={err ? err : "بازه زمانی را تغییر بده و دوباره تلاش کن."}
      emptyActionLabel="بازخوانی"
      onEmptyAction={load}
      toolbarRight={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted">از</label>
            <ShamsiDatePicker
              selectedDate={fromDate}
              onChange={(d) => d && setFromDate(d)}
              inputClassName="h-10 w-44 px-3 rounded-xl border bg-white/70 dark:bg-white/5 border-black/10 dark:border-white/10"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-muted">تا</label>
            <ShamsiDatePicker
              selectedDate={toDate}
              onChange={(d) => d && setToDate(d)}
              inputClassName="h-10 w-44 px-3 rounded-xl border bg-white/70 dark:bg-white/5 border-black/10 dark:border-white/10"
            />
          </div>

          <select
            value={forecastDays}
            onChange={(e) => setForecastDays(Number(e.target.value))}
            className="h-10 px-3 rounded-xl border bg-white/70 dark:bg-white/5 border-black/10 dark:border-white/10"
          >
            {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{d} روز</option>)}
          </select>

          <button onClick={load} className="h-10 px-4 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700">
            به‌روزرسانی
          </button>
        </div>
      }
    >
      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
              <div className="text-xs text-muted">ورودی</div>
              <div className="mt-2 text-2xl font-extrabold">{fmt(data.totals.inflow)}</div>
            </div>
            <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
              <div className="text-xs text-muted">خروجی</div>
              <div className="mt-2 text-2xl font-extrabold">{fmt(data.totals.outflow)}</div>
            </div>
            <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
              <div className="text-xs text-muted">خالص</div>
              <div className="mt-2 text-2xl font-extrabold">{fmt(data.totals.net)}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 mb-4">
            <div className="text-sm font-semibold mb-3">نمودار (بازه انتخابی)</div>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="inflow" />
                  <Line type="monotone" dataKey="outflow" />
                  <Line type="monotone" dataKey="net" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
            <div className="text-sm font-semibold mb-3">پیش‌بینی (میانگین {forecastDays} روز اخیر)</div>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={forecastChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="inflow" />
                  <Line type="monotone" dataKey="outflow" />
                  <Line type="monotone" dataKey="net" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </PageKit>
  );
}
