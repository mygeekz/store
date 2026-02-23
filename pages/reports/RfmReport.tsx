// pages/reports/RfmReport.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { RfmItem, NotificationMessage } from '../../types';
import { apiFetch } from '../../utils/apiFetch';
import Notification from '../../components/Notification';

const badge = (v: number, tone: 'emerald' | 'amber' | 'rose' = 'emerald') => {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300',
    amber: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300',
    rose: 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300',
  };
  return (
    <span className={`inline-flex items-center justify-center min-w-8 px-2 h-7 rounded-xl border text-xs font-bold ${tones[tone]}`}>
      {v}
    </span>
  );
};

const segLabel = (code: string) => {
  // یک نام‌گذاری ساده و کاربردی (قابل ارتقا)
  const r = Number(code[0] || 0);
  const f = Number(code[1] || 0);
  const m = Number(code[2] || 0);
  const score = r + f + m;
  if (score >= 8) return 'VIP / طلایی';
  if (score >= 6) return 'فعال / ارزشمند';
  if (score >= 4) return 'در حال رشد';
  return 'در معرض ریزش';
};

const RfmReport: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<RfmItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  useEffect(() => {
    if (currentUser) {
      const allowed = ['Admin', 'Manager', 'Marketer'];
      if (!allowed.includes(currentUser.roleName)) {
        setNotification({ type: 'error', text: 'شما اجازه دسترسی به این صفحه را ندارید.' });
        navigate('/');
      }
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch('/api/reports/rfm');
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت داده‌ها');
        setItems(json.data || []);
      } catch (err: any) {
        setNotification({ type: 'error', text: err.message || 'خطای ناشناخته در دریافت گزارش' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const segments = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((it) => {
      const seg = it.rfm;
      map[seg] = (map[seg] || 0) + 1;
    });
    return Object.entries(map)
      .map(([segment, count]) => ({ segment, count, label: segLabel(segment) }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  const totalCustomers = items.length;
  const topSeg = segments[0];

  const moneySum = useMemo(() => items.reduce((acc, it) => acc + (Number(it.monetary) || 0), 0), [items]);
  const avgRecency = useMemo(() => {
    if (!items.length) return 0;
    return Math.round(items.reduce((acc, it) => acc + (Number(it.recencyDays) || 0), 0) / items.length);
  }, [items]);

  return (
    <div className="report-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      {/* Hero */}
      <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/10 via-white/60 to-white dark:from-primary/20 dark:via-white/5 dark:to-white/0 p-5 md:p-6 shadow-sm dark:shadow-none">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                <i className="fa-solid fa-chart-pie text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl md:text-2xl font-extrabold text-text truncate">گزارش RFM</h2>
                <p className="text-sm text-muted mt-0.5">تحلیل رفتار مشتری بر اساس تازگی خرید، تعداد خرید و مبلغ خرید</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/#/reports"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition shadow-sm"
            >
              <i className="fa-solid fa-arrow-right" />
              بازگشت به لیست
            </Link>
          </div>
        </div>

        {/* KPI */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-primary/10 bg-white/70 dark:bg-white/5 p-4">
            <div className="text-xs text-muted">تعداد مشتری</div>
            <div className="mt-2 text-2xl font-extrabold text-text">{totalCustomers.toLocaleString('fa-IR')}</div>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-white/70 dark:bg-white/5 p-4">
            <div className="text-xs text-muted">میانگین روز از آخرین خرید</div>
            <div className="mt-2 text-2xl font-extrabold text-text">{avgRecency.toLocaleString('fa-IR')}</div>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-white/70 dark:bg-white/5 p-4">
            <div className="text-xs text-muted">جمع مبلغ خرید (کل)</div>
            <div className="mt-2 text-2xl font-extrabold text-text">{moneySum.toLocaleString('fa-IR')} تومان</div>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-white/70 dark:bg-white/5 p-4">
            <div className="text-xs text-muted">بزرگ‌ترین سگمنت</div>
            <div className="mt-2 text-lg font-extrabold text-text">
              {topSeg ? (
                <span className="inline-flex items-center gap-2">
                  <span className="px-2 h-7 inline-flex items-center rounded-xl border border-primary/15 bg-primary/5 text-primary font-bold text-sm">
                    {topSeg.segment}
                  </span>
                  <span className="text-sm text-muted">{topSeg.label}</span>
                </span>
              ) : (
                '-'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Segments */}
      <div className="mt-4 rounded-2xl border border-primary/10 bg-white/70 dark:bg-white/5 p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-base font-extrabold text-text">سگمنت‌ها</div>
            <div className="text-xs text-muted mt-1">کدهای پرتکرار را سریع پیدا کن و روی آن‌ها تمرکز کن.</div>
          </div>
        </div>

        {segments.length === 0 && !isLoading ? (
          <div className="text-sm text-muted">سگمنتی برای نمایش موجود نیست.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {segments.slice(0, 8).map((s, idx) => (
              <div
                key={s.segment}
                className="rounded-2xl border border-primary/10 bg-gradient-to-b from-white to-primary/5 dark:from-white/5 dark:to-primary/10 p-4 hover:shadow-sm transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center text-xs font-extrabold text-primary">
                      {idx + 1}
                    </span>
                    <span className="px-2 h-7 inline-flex items-center rounded-xl border border-primary/15 bg-primary/5 text-primary font-extrabold text-sm">
                      {s.segment}
                    </span>
                  </div>
                  <span className="text-sm font-extrabold text-text">{s.count.toLocaleString('fa-IR')}</span>
                </div>
                <div className="text-xs text-muted mt-2">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="mt-4 rounded-2xl border border-primary/10 bg-white/70 dark:bg-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-primary/10 flex items-center justify-between">
          <div>
            <div className="text-base font-extrabold text-text">جزئیات مشتریان</div>
            <div className="text-xs text-muted mt-1">هر مشتری به صورت R / F / M امتیازدهی شده است.</div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <i className="fas fa-spinner fa-spin text-3xl text-primary"></i>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-primary/5">
                <tr className="text-right">
                  <th className="px-5 py-3 font-semibold text-text">مشتری</th>
                  <th className="px-5 py-3 font-semibold text-text">روز از آخرین خرید</th>
                  <th className="px-5 py-3 font-semibold text-text">تعداد خرید</th>
                  <th className="px-5 py-3 font-semibold text-text">جمع مبلغ</th>
                  <th className="px-5 py-3 font-semibold text-text">R</th>
                  <th className="px-5 py-3 font-semibold text-text">F</th>
                  <th className="px-5 py-3 font-semibold text-text">M</th>
                  <th className="px-5 py-3 font-semibold text-text">کد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {items.map((it, i) => (
                  <tr key={it.customerId} className={i % 2 ? 'bg-white/50 dark:bg-white/0' : ''}>
                    <td className="px-5 py-3 whitespace-nowrap font-semibold text-text">{it.customerName}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-text">{Number(it.recencyDays || 0).toLocaleString('fa-IR')}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-text">{Number(it.frequency || 0).toLocaleString('fa-IR')}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-text">{Number(it.monetary || 0).toLocaleString('fa-IR')}</td>
                    <td className="px-5 py-3 whitespace-nowrap">{badge(it.rScore, it.rScore >= 3 ? 'emerald' : it.rScore === 2 ? 'amber' : 'rose')}</td>
                    <td className="px-5 py-3 whitespace-nowrap">{badge(it.fScore, it.fScore >= 3 ? 'emerald' : it.fScore === 2 ? 'amber' : 'rose')}</td>
                    <td className="px-5 py-3 whitespace-nowrap">{badge(it.mScore, it.mScore >= 3 ? 'emerald' : it.mScore === 2 ? 'amber' : 'rose')}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        <span className="px-2 h-7 inline-flex items-center rounded-xl border border-primary/15 bg-primary/5 text-primary font-extrabold text-sm">
                          {it.rfm}
                        </span>
                        <span className="text-xs text-muted">{segLabel(it.rfm)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RfmReport;
