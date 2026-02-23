import React, {useEffect, useMemo, useRef, useState} from 'react';
import moment from 'jalali-moment';
import { ResponsiveContainer, PieChart, Pie, Tooltip, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import Notification from '../../components/Notification';
import { useAuth } from '../../contexts/AuthContext';
import type { NotificationMessage } from '../../types';


import { useReportsExports } from '../../contexts/ReportsExportsContext';

type Row = {
  productId: number;
  name: string;
  qty: number;
  revenue: number;
  cogs: number;
  profit: number;
  avgBuyPrice: number;
  avgSellPrice: number;
  shareOfRevenue: number;
  marginPct: number;
};

type Payload = { from: string; to: string; totalRevenue: number; items: Row[] };

const fmtMoney = (n: any) => Number(n || 0).toLocaleString('fa-IR');
const fmtNum = (n: any) => Number(n || 0).toLocaleString('fa-IR');

export default function ProductProfitReal() {
  const { token } = useAuth();
  const { registerReportExports } = useReportsExports();
  const exportExcelRef = useRef<() => void>(() => {});
  const [fromDate, setFromDate] = useState<Date | null>(moment().startOf('month').toDate());
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [q, setQ] = useState('');
  const [payload, setPayload] = useState<Payload | null>(null);
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
      const res = await fetch(`/api/reports/product-profit-real?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت گزارش سود واقعی محصولات');
      setPayload(js.data || null);
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    } finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (!token) return;
    const t = window.setTimeout(() => { void fetchData(); }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, fromDate, toDate]);

  const rows = useMemo(() => payload?.items || [], [payload]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const r = !s ? rows : rows.filter(x => String(x.name||'').toLowerCase().includes(s));
    return r.sort((a,b) => Number(b.profit||0) - Number(a.profit||0));
  }, [rows, q]);

  const topShare = useMemo(() => {
    const r = [...rows].sort((a,b)=>Number(b.revenue||0)-Number(a.revenue||0)).slice(0, 6);
    return r.map(x => ({ name: x.name, value: Number(x.revenue || 0) }));
  }, [rows]);

  const topProfit = useMemo(() => {
    const r = [...rows].sort((a,b)=>Number(b.profit||0)-Number(a.profit||0)).slice(0, 8);
    return r.map(x => ({ name: x.name, profit: Number(x.profit||0) }));
  }, [rows]);

  const summary = useMemo(() => {
    const totalRevenue = Number(payload?.totalRevenue || 0);
    const totalCogs = rows.reduce((s,x)=>s+Number(x.cogs||0), 0);
    const totalProfit = rows.reduce((s,x)=>s+Number(x.profit||0), 0);
    const marginPct = totalRevenue > 0 ? (totalProfit/totalRevenue)*100 : 0;
    const totalQty = rows.reduce((s,x)=>s+Number(x.qty||0), 0);
    return { totalRevenue, totalCogs, totalProfit, marginPct, totalQty };
  }, [payload, rows]);


  const exportExcel = async () => {
    if (!token) return;
    const qs = new URLSearchParams();
    if (fromDate) qs.set('from', moment(fromDate).startOf('day').toDate().toISOString());
    if (toDate) qs.set('to', moment(toDate).endOf('day').toDate().toISOString());
    const url = `/api/exports/product-profit-real.xlsx?${qs.toString()}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('خطا در دریافت فایل اکسل');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `product_profit_real_${moment().format('YYYY-MM-DD')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // اتصال دکمه Excel بالای ReportsLayout به خروجی دقیق همین صفحه
  exportExcelRef.current = exportExcel;
  useEffect(() => {
    registerReportExports({ excel: () => exportExcelRef.current() });
    return () => registerReportExports({});
  }, [registerReportExports]);


  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const title = 'سود واقعی هر محصول (FIFO)';
    doc.setFontSize(12);
    // @ts-ignore
    doc.text(title, 10, 10);

    const body = filtered.map(r => ([
      r.name,
      String(r.avgBuyPrice || 0),
      String(r.avgSellPrice || 0),
      String(r.qty || 0),
      String(r.revenue || 0),
      String(r.profit || 0),
      String(r.shareOfRevenue || 0),
      String(r.marginPct || 0),
    ]));

    // @ts-ignore
    doc.autoTable({
      head: [['محصول','قیمت خرید','قیمت فروش','تعداد','درآمد','سود','سهم%','حاشیه%']],
      body,
      startY: 16,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 144, 255] }
    });

    doc.save(`product_profit_real_${moment().format('YYYY-MM-DD')}.pdf`);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute -top-16 -left-16 h-40 w-40 rounded-full bg-amber-100 blur-2xl opacity-70 dark:bg-amber-900/30" />
        <div className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-emerald-100 blur-2xl opacity-70 dark:bg-emerald-900/30" />
        <div className="relative flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">سود واقعی هر محصول (FIFO)</div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">قیمت خرید/فروش، سود، تعداد فروش، سهم از درآمد</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ShamsiDatePicker selectedDate={fromDate} onDateChange={setFromDate} placeholder="از تاریخ"
              inputClassName="w-full px-3 py-2 rounded-xl border bg-white/70 backdrop-blur dark:bg-slate-900/50 dark:border-slate-700 text-sm" />
            <ShamsiDatePicker selectedDate={toDate} onDateChange={setToDate} placeholder="تا تاریخ"
              inputClassName="w-full px-3 py-2 rounded-xl border bg-white/70 backdrop-blur dark:bg-slate-900/50 dark:border-slate-700 text-sm" />
            <input value={q} onChange={(e)=>setQ(e.target.value)}
              className="px-3 py-2 rounded-xl border bg-white/70 backdrop-blur dark:bg-slate-900/50 dark:border-slate-700 text-sm"
              placeholder="جستجوی محصول…" />
            <button onClick={async () => { try { await exportExcel(); } catch (e:any) { setNotification({ message: e?.message || 'خطا', type: 'error' }); } }} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
              <i className="fa-solid fa-file-excel ml-2" /> خروجی اکسل
            </button>
            <button onClick={() => { try { exportPdf(); } catch (e:any) { setNotification({ message: e?.message || 'خطا', type: 'error' }); } }} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold">
              <i className="fa-solid fa-file-pdf ml-2" /> خروجی PDF
            </button>
            <button onClick={fetchData} className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold">
              <i className="fa-solid fa-rotate ml-2" /> بروزرسانی
            </button>
          </div>
        </div>
      </div>

      {notification ? <Notification message={notification.message} type={notification.type} /> : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">درآمد کل</div>
          <div className="mt-2 text-xl font-bold">{fmtMoney(summary.totalRevenue)}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">COGS کل (FIFO)</div>
          <div className="mt-2 text-xl font-bold">{fmtMoney(summary.totalCogs)}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">سود کل</div>
          <div className="mt-2 text-xl font-bold">{fmtMoney(summary.totalProfit)}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">حاشیه سود کل</div>
          <div className="mt-2 text-xl font-bold">{fmtNum(summary.marginPct)}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            <i className="fa-solid fa-chart-pie ml-2 text-amber-600" /> سهم از درآمد (Top 6)
          </div>
          <div className="mt-3 h-72">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">در حال دریافت...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topShare} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {topShare.map((_, i) => <Cell key={i} />)}
                  </Pie>
                  <Tooltip formatter={(v:any)=>fmtMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">نکته: اگر محصولات زیاد باشند، فقط ۶ مورد اول نمایش داده می‌شود.</div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            <i className="fa-solid fa-chart-column ml-2 text-emerald-600" /> بیشترین سود (Top 8)
          </div>
          <div className="mt-3 h-72">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">در حال دریافت...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProfit} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis tickFormatter={(v) => (Number(v) / 1000).toLocaleString('fa-IR') + 'k'} width={50} />
                  <Tooltip formatter={(v:any)=>fmtMoney(v)} />
                  <Bar dataKey="profit" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden dark:bg-slate-900/70 dark:border-slate-800">
        {isLoading ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">در حال دریافت...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">داده‌ای وجود ندارد.</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/70">
                <tr className="text-right">
                  <th className="p-3">محصول</th>
                  <th className="p-3">قیمت خرید (میانگین)</th>
                  <th className="p-3">قیمت فروش (میانگین)</th>
                  <th className="p-3">تعداد فروش</th>
                  <th className="p-3">درآمد</th>
                  <th className="p-3">سود</th>
                  <th className="p-3">سهم از درآمد%</th>
                  <th className="p-3">حاشیه%</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.productId} className={`border-t border-gray-100 dark:border-slate-800 ${r.profit < 0 ? 'bg-rose-50 dark:bg-rose-900/10' : ''}`}>
                    <td className="p-3 font-semibold">{r.name}</td>
                    <td className="p-3 whitespace-nowrap">{fmtMoney(r.avgBuyPrice)}</td>
                    <td className="p-3 whitespace-nowrap">{fmtMoney(r.avgSellPrice)}</td>
                    <td className="p-3 whitespace-nowrap">{fmtNum(r.qty)}</td>
                    <td className="p-3 whitespace-nowrap">{fmtMoney(r.revenue)}</td>
                    <td className="p-3 whitespace-nowrap font-semibold">{fmtMoney(r.profit)}</td>
                    <td className="p-3 whitespace-nowrap">{fmtNum(r.shareOfRevenue)}%</td>
                    <td className="p-3 whitespace-nowrap">{fmtNum(r.marginPct)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
