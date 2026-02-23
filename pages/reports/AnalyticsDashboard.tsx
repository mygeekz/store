import React, { useEffect, useMemo, useState } from 'react';
import moment from 'jalali-moment';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import Notification from '../../components/Notification';
import { useAuth } from '../../contexts/AuthContext';
import type { NotificationMessage } from '../../types';

type AnalyticsData = {
  range: { from: string; to: string };
  salesTrend: { date: string; revenue: number }[];
  debtDailyTrend: { date: string; debt: number }[];
  debtByDueMonth: { month: string; debt: number }[];
  monthComparison: { month: string; revenue: number }[];
  bestProductsByProfit: { id: number; name: string; qty: number; revenue: number; unitCost: number; cogs: number; profit: number }[];
  worstProductsByProfit: { id: number; name: string; qty: number; revenue: number; unitCost: number; cogs: number; profit: number }[];
  bestProducts: { id: number; name: string; qty: number; revenue: number }[];
  worstProducts: { id: number; name: string; qty: number; revenue: number }[];
};

const fmtMoney = (n: any) => {
  const v = Number(n || 0);
  return v.toLocaleString('fa-IR');
};

const prettyDay = (iso: string) => {
  // iso YYYY-MM-DD -> jalali short
  try { return moment(iso, 'YYYY-MM-DD').locale('fa').format('jMM/jDD'); } catch { return iso; }
};

const prettyMonth = (ym: string) => {
  try { return moment(ym + '-01', 'YYYY-MM-DD').locale('fa').format('jYY/jMM'); } catch { return ym; }
};

export default function AnalyticsDashboard() {
  const { token } = useAuth();
  const [fromDate, setFromDate] = useState<Date | null>(moment().subtract(30, 'days').toDate());
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    setNotification(null);
    try {
      const qs = new URLSearchParams();
      if (fromDate) qs.set('from', moment(fromDate).startOf('day').toDate().toISOString());
      if (toDate) qs.set('to', moment(toDate).endOf('day').toDate().toISOString());

      const res = await fetch(`/api/reports/analytics-dashboard?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت گزارش تحلیلی');
      setData(js.data);
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    const t = window.setTimeout(() => { void fetchData(); }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, fromDate, toDate]);

  const kpis = useMemo(() => {
    const totalRevenue = (data?.salesTrend || []).reduce((s, x) => s + Number(x.revenue || 0), 0);
    const avgDaily = data?.salesTrend?.length ? Math.round(totalRevenue / data.salesTrend.length) : 0;
    const totalDebt = (data?.debtTrend || []).reduce((s, x) => s + Number(x.debt || 0), 0);
    return { totalRevenue, avgDaily, totalDebt };
  }, [data]);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute -top-16 -left-16 h-40 w-40 rounded-full bg-indigo-100 blur-2xl opacity-70 dark:bg-indigo-900/30" />
        <div className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-emerald-100 blur-2xl opacity-70 dark:bg-emerald-900/30" />
        <div className="relative flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              داشبورد تحلیلی واقعی
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              روند فروش • روند بدهی • مقایسه ماه‌ها • بهترین/بدترین محصول
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <ShamsiDatePicker
              selectedDate={fromDate}
              onDateChange={setFromDate}
              placeholder="از تاریخ"
              inputClassName="w-full px-3 py-2 rounded-xl border bg-white/70 backdrop-blur dark:bg-slate-900/50 dark:border-slate-700 text-sm"
            />
            <ShamsiDatePicker
              selectedDate={toDate}
              onDateChange={setToDate}
              placeholder="تا تاریخ"
              inputClassName="w-full px-3 py-2 rounded-xl border bg-white/70 backdrop-blur dark:bg-slate-900/50 dark:border-slate-700 text-sm"
            />
            <button
              onClick={fetchData}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold"
            >
              <i className="fa-solid fa-rotate ml-2" />
              بروزرسانی
            </button>
          </div>
        </div>
      </div>

      {notification ? <Notification message={notification.message} type={notification.type} /> : null}

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">جمع درآمد بازه</div>
          <div className="mt-2 text-2xl font-bold">{fmtMoney(kpis.totalRevenue)}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">مجموع فروش روزانه + پیش‌پرداخت اقساط</div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">میانگین فروش روزانه</div>
          <div className="mt-2 text-2xl font-bold">{fmtMoney(kpis.avgDaily)}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">تخمینی بر اساس بازه انتخابی</div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">کل بدهی اقساط پرداخت‌نشده</div>
          <div className="mt-2 text-2xl font-bold">{fmtMoney(kpis.totalDebt)}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">بر اساس اقساط «پرداخت نشده»</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              <i className="fa-solid fa-chart-line ml-2 text-sky-600" />
              روند فروش (روزانه)
            </div>
          </div>

          <div className="mt-3 h-72">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">در حال دریافت...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.salesTrend || []} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={prettyDay} minTickGap={18} />
                  <YAxis tickFormatter={(v) => (Number(v) / 1000).toLocaleString('fa-IR') + 'k'} width={50} />
                  <Tooltip formatter={(v: any) => fmtMoney(v)} labelFormatter={(l: any) => prettyDay(String(l))} />
                  <Line type="monotone" dataKey="revenue" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            <i className="fa-solid fa-scale-balanced ml-2 text-rose-600" />
            روند بدهی واقعی (روزانه)
          </div>

          <div className="mt-3 h-72">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">در حال دریافت...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.debtDailyTrend || []} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={prettyDay} minTickGap={18} />
                  <YAxis tickFormatter={(v) => (Number(v) / 1000).toLocaleString('fa-IR') + 'k'} width={50} />
                  <Tooltip formatter={(v: any) => fmtMoney(v)} labelFormatter={(l: any) => prettyDay(String(l))} />
                  <Line type="monotone" dataKey="debt" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          
          <div className="mt-4 rounded-xl border bg-white/60 p-3 text-xs text-gray-700 dark:bg-slate-900/40 dark:border-slate-800 dark:text-gray-200">
            <div className="font-semibold mb-2">بدهی (بر اساس سررسید اقساط) — نمای ثانویه</div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.debtByDueMonth || []} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickFormatter={prettyMonth} />
                  <YAxis tickFormatter={(v) => (Number(v) / 1000).toLocaleString('fa-IR') + 'k'} width={50} />
                  <Tooltip formatter={(v: any) => fmtMoney(v)} labelFormatter={(l: any) => prettyMonth(String(l))} />
                  <Bar dataKey="debt" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

</div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800 xl:col-span-2">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            <i className="fa-solid fa-chart-column ml-2 text-indigo-600" />
            مقایسه ماه‌ها (۶ ماه اخیر)
          </div>

          <div className="mt-3 h-72">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">در حال دریافت...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.monthComparison || []} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={prettyDay} />
                  <YAxis tickFormatter={(v) => (Number(v) / 1000).toLocaleString('fa-IR') + 'k'} width={50} />
                  <Tooltip formatter={(v: any) => fmtMoney(v)} labelFormatter={(l: any) => prettyDay(String(l))} />
                  <Bar dataKey="revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Best/Worst products */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            <i className="fa-solid fa-trophy ml-2 text-emerald-600" />
            بهترین محصولات
          </div>

          <div className="mt-3 overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/70">
                <tr className="text-right">
                  <th className="p-2">محصول</th>
                  <th className="p-2">تعداد</th>
                  <th className="p-2">درآمد</th>
                </tr>
              </thead>
              <tbody>
                {(data?.bestProducts || []).map((p) => (
                  <tr key={p.id} className="border-t border-gray-100 dark:border-slate-800">
                    <td className="p-2">{p.name}</td>
                    <td className="p-2 whitespace-nowrap">{Number(p.qty).toLocaleString('fa-IR')}</td>
                    <td className="p-2 whitespace-nowrap font-semibold">{fmtMoney(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data?.bestProducts || data.bestProducts.length === 0) ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">داده‌ای وجود ندارد.</div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            <i className="fa-solid fa-bug ml-2 text-rose-600" />
            بدترین محصولات (کمترین درآمد)
          </div>

          <div className="mt-3 overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/70">
                <tr className="text-right">
                  <th className="p-2">محصول</th>
                  <th className="p-2">تعداد</th>
                  <th className="p-2">درآمد</th>
                </tr>
              </thead>
              <tbody>
                {(data?.worstProducts || []).map((p) => (
                  <tr key={p.id} className="border-t border-gray-100 dark:border-slate-800">
                    <td className="p-2">{p.name}</td>
                    <td className="p-2 whitespace-nowrap">{Number(p.qty).toLocaleString('fa-IR')}</td>
                    <td className="p-2 whitespace-nowrap font-semibold">{fmtMoney(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data?.worstProducts || data.worstProducts.length === 0) ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">داده‌ای وجود ندارد.</div>
            ) : null}
          </div>
        </div>
      

      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            <i className="fa-solid fa-sack-dollar ml-2 text-emerald-600" />
            بهترین محصولات بر اساس سود (واقعی)
          </div>

          <div className="mt-3 overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/70">
                <tr className="text-right">
                  <th className="p-2">محصول</th>
                  <th className="p-2">تعداد</th>
                  <th className="p-2">درآمد</th>
                  <th className="p-2">سود</th>
                </tr>
              </thead>
              <tbody>
                {(data?.bestProductsByProfit || []).map((p) => (
                  <tr key={p.id} className="border-t border-gray-100 dark:border-slate-800">
                    <td className="p-2">{p.name}</td>
                    <td className="p-2 whitespace-nowrap">{Number(p.qty).toLocaleString('fa-IR')}</td>
                    <td className="p-2 whitespace-nowrap">{fmtMoney(p.revenue)}</td>
                    <td className="p-2 whitespace-nowrap font-semibold">{fmtMoney(p.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data?.bestProductsByProfit || data.bestProductsByProfit.length === 0) ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">داده‌ای وجود ندارد.</div>
            ) : null}
          </div>

          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            سود واقعی (FIFO) = درآمد − (میانگین قیمت خرید × تعداد فروش). اگر خرید ثبت نشده باشد از purchasePrice محصول استفاده می‌شود.
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            <i className="fa-solid fa-triangle-exclamation ml-2 text-rose-600" />
            بدترین محصولات بر اساس سود (واقعی)
          </div>

          <div className="mt-3 overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/70">
                <tr className="text-right">
                  <th className="p-2">محصول</th>
                  <th className="p-2">تعداد</th>
                  <th className="p-2">درآمد</th>
                  <th className="p-2">سود</th>
                </tr>
              </thead>
              <tbody>
                {(data?.worstProductsByProfit || []).map((p) => (
                  <tr key={p.id} className="border-t border-gray-100 dark:border-slate-800">
                    <td className="p-2">{p.name}</td>
                    <td className="p-2 whitespace-nowrap">{Number(p.qty).toLocaleString('fa-IR')}</td>
                    <td className="p-2 whitespace-nowrap">{fmtMoney(p.revenue)}</td>
                    <td className="p-2 whitespace-nowrap font-semibold">{fmtMoney(p.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data?.worstProductsByProfit || data.worstProductsByProfit.length === 0) ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">داده‌ای وجود ندارد.</div>
            ) : null}
          </div>
        </div>
      </div>

</div>
    </div>
  );
}
