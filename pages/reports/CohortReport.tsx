// pages/reports/CohortReport.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'jalali-moment'; // ⬅️ اضافه شد
import { CohortRow, NotificationMessage } from '../../types';
import { apiFetch } from '../../utils/apiFetch';
import Notification from '../../components/Notification';
import { useAuth } from '../../contexts/AuthContext';
import { useStyle } from '../../contexts/StyleContext';

const CohortReport: React.FC = () => {
  const { currentUser } = useAuth();
  const { style } = useStyle();
  const navigate = useNavigate();

  const [rows, setRows] = useState<CohortRow[]>([]);
  const [maxMonths, setMaxMonths] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const brand = `hsl(${style.primaryHue} 90% 55%)`;
  const brandSoft = `hsla(${style.primaryHue}, 90%, 55%, 0.14)`;
  const heroGradient = {
    background:
      `radial-gradient(1200px 400px at 80% 0%, hsla(${style.primaryHue}, 90%, 55%, .22), transparent 60%),` +
      `linear-gradient(180deg, rgba(15,23,42,.92), rgba(15,23,42,.72))`,
  } as React.CSSProperties;

  // ⬅️ کمکی: تبدیل «ماه» به شمسی
  const toShamsiMonth = (input: string) => {
    // اگر «YYYY-MM» بود، یک روز به آخرش اضافه می‌کنیم تا قابل پارس باشد
    const guess = /^\d{4}[-/]\d{2}$/.test(input) ? `${input}-01` : input;
    const m = moment(guess, [
      moment.ISO_8601,
      'YYYY-MM-DD',
      'YYYY/MM/DD',
      'YYYY-MM',
      'YYYY/MM',
    ]).locale('fa');
    return m.isValid() ? m.format('jYYYY/jMM') : input;
  };

  useEffect(() => {
    if (currentUser) {
      const allowed = ['Admin', 'Manager', 'Marketer'];
      if (!allowed.includes(currentUser.roleName)) {
        setNotification({ type: 'error', text: 'شما اجازه دسترسی به این صفحه را ندارید.' });
        navigate('/');
        return;
      }
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch('/api/reports/cohort');
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت داده‌ها');
        const items: CohortRow[] = json.data || [];
        let max = 0;
        items.forEach((row) => { if (Array.isArray(row.counts)) max = Math.max(max, row.counts.length); });
        setMaxMonths(max);
        setRows(items);
      } catch (err: any) {
        setNotification({ type: 'error', text: err.message || 'خطای ناشناخته در دریافت گزارش' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const thBase = 'px-3 py-3 text-right text-[11px] font-bold whitespace-nowrap border-b border-slate-200/70 dark:border-slate-800/80 text-slate-600 dark:text-slate-200';
  const tdBase = 'px-3 py-3 text-right text-sm align-middle border-b border-slate-200/70 dark:border-slate-800/80';
  const headBg = 'bg-slate-50/70 dark:bg-slate-900/50 backdrop-blur';
  const tableWrap = 'overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/30';
  const cardWrap = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/30 shadow-[0_18px_60px_-45px_rgba(0,0,0,.55)]';
  const innerPad = 'p-4 md:p-6';

  const cellStyle = (percentNumber: number): React.CSSProperties => {
    const t = Math.max(0, Math.min(1, percentNumber / 100));
    const isDark = document.documentElement.classList.contains('dark');
    const alpha = isDark ? 0.14 + t * 0.22 : 0.1 + t * 0.35;
    return { backgroundColor: `hsla(${style.primaryHue}, 90%, 55%, ${alpha})` };
  };

  const stats = useMemo(() => {
    const cohorts = rows.length;
    const totalCustomers = rows.reduce((acc, r) => acc + (r.customersCount || 0), 0);

    const m2 = rows
      .filter((r) => (r.customersCount || 0) > 0)
      .map((r) => {
        const base = r.customersCount || 0;
        const v = Array.isArray(r.counts) ? (r.counts[1] || 0) : 0;
        return base ? v / base : 0;
      });
    const avgM2 = m2.length ? Math.round((m2.reduce((a, b) => a + b, 0) / m2.length) * 100) : 0;

    let bestMonth = 0;
    let bestScore = -1;
    for (let i = 0; i < maxMonths; i++) {
      const vals = rows
        .filter((r) => (r.customersCount || 0) > 0)
        .map((r) => {
          const base = r.customersCount || 0;
          const v = Array.isArray(r.counts) ? (r.counts[i] || 0) : 0;
          return base ? v / base : 0;
        });
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      if (avg > bestScore) {
        bestScore = avg;
        bestMonth = i + 1;
      }
    }

    return {
      cohorts,
      totalCustomers,
      avgM2,
      bestMonth: bestMonth || 1,
      bestScore: bestScore > 0 ? Math.round(bestScore * 100) : 0,
    };
  }, [rows, maxMonths]);

  return (
    <div className="report-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      {/* Premium Hero */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-[0_26px_90px_-70px_rgba(0,0,0,.65)]" style={heroGradient}>
        <div className="p-5 md:p-7">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-white/10 ring-1 ring-white/15 grid place-items-center">
                  <span className="text-xl">🧬</span>
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl md:text-2xl font-extrabold text-white truncate">
                    گزارش Cohort (تحلیل حفظ مشتری)
                  </h2>
                  <div className="text-xs md:text-sm text-white/70 mt-1">
                    نقشه‌ی حرارتی بازگشت مشتریان بر اساس ماه اولین خرید (Cohort)
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 ring-1 ring-white/15 px-3 py-2 text-xs text-white/85">
                <span className="h-2 w-2 rounded-full" style={{ background: brand }} />
                شدت رنگ = درصد نگهداشت
              </span>
            </div>
          </div>

          {/* KPIs */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white/10 ring-1 ring-white/15 px-4 py-3">
              <div className="text-[11px] text-white/70">تعداد Cohort</div>
              <div className="mt-1 text-lg font-extrabold text-white">{stats.cohorts.toLocaleString('fa-IR')}</div>
            </div>
            <div className="rounded-2xl bg-white/10 ring-1 ring-white/15 px-4 py-3">
              <div className="text-[11px] text-white/70">کل مشتریان</div>
              <div className="mt-1 text-lg font-extrabold text-white">{stats.totalCustomers.toLocaleString('fa-IR')}</div>
            </div>
            <div className="rounded-2xl bg-white/10 ring-1 ring-white/15 px-4 py-3">
              <div className="text-[11px] text-white/70">میانگین نگهداشت ماه ۲</div>
              <div className="mt-1 text-lg font-extrabold text-white">٪{stats.avgM2.toLocaleString('fa-IR')}</div>
            </div>
            <div className="rounded-2xl bg-white/10 ring-1 ring-white/15 px-4 py-3">
              <div className="text-[11px] text-white/70">بهترین ماه</div>
              <div className="mt-1 text-lg font-extrabold text-white">
                ماه {stats.bestMonth.toLocaleString('fa-IR')} <span className="text-white/70 text-sm">(٪{stats.bestScore.toLocaleString('fa-IR')})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`${cardWrap} mt-4`}>
        <div className={innerPad}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <p className="text-sm text-slate-600 dark:text-slate-200/80 leading-7 max-w-3xl">
              مشتریان بر اساس ماهِ اولین خرید خوشه‌بندی می‌شوند و نرخ بازگشت در ماه‌های بعدی نمایش داده می‌شود. هرچه رنگ سلول پررنگ‌تر باشد، درصد نگهداشت بالاتر است.
            </p>

            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-500 dark:text-slate-300/70">کم</div>
              <div className="h-2 w-28 rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden" style={{ background: `linear-gradient(90deg, ${brandSoft}, ${brand})` }} />
              <div className="text-xs text-slate-500 dark:text-slate-300/70">زیاد</div>
            </div>
          </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="h-10 w-10 rounded-full border-2 border-slate-200 border-t-transparent dark:border-slate-700 dark:border-t-transparent animate-spin" style={{ borderTopColor: brand }} />
          </div>
        ) : (
          <div className={tableWrap}>
            <table className="min-w-full border-collapse">
              <thead className={headBg} style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  <th className={`${thBase} sticky right-0 z-[2] ${headBg}`}>ماه اول خرید</th>
                  <th className={`${thBase} sticky right-[132px] z-[2] ${headBg}`}>تعداد مشتریان</th>
                  {Array.from({ length: maxMonths }, (_, i) => (
                    <th key={i} className={thBase}>ماه {i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-transparent">
                {rows.map((row, rIdx) => (
                  <tr key={row.cohortMonth} className={rIdx % 2 === 0 ? 'bg-gray-50/60 dark:bg-slate-800/30' : 'bg-transparent'}>
                    {/* ⬅️ نمایش شمسی */}
                    <td className={`${tdBase} font-bold text-slate-800 dark:text-slate-50 sticky right-0 z-[1] bg-inherit`}>
                      {toShamsiMonth(row.cohortMonth)}
                    </td>
                    <td className={`${tdBase} sticky right-[132px] z-[1] bg-inherit text-slate-700 dark:text-slate-100`}>
                      {row.customersCount?.toLocaleString('fa-IR') ?? 0}
                    </td>

                    {Array.from({ length: maxMonths }, (_, i) => {
                      const val = row.counts && row.counts[i] != null ? row.counts[i] : 0;
                      const percentNumber = row.customersCount ? Math.round((val / row.customersCount) * 100) : 0;
                      const percentText = row.customersCount ? `${percentNumber}%` : '-';
                      return (
                        <td
                          key={i}
                          className={`${tdBase} text-slate-800 dark:text-slate-100`}
                          style={row.customersCount ? cellStyle(percentNumber) : undefined}
                          title={row.customersCount ? `${val} نفر (${percentText})` : '—'}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">{val.toLocaleString('fa-IR')}</span>
                            <span className="text-[11px] opacity-80">٪{percentNumber.toLocaleString('fa-IR')}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default CohortReport;
