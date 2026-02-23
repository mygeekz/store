// pages/reports/AnalysisHub.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NotificationMessage } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import Notification from '../../components/Notification';
import ModernReportShell from '../../components/reports/ModernReportShell';

type Item = {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
  tag?: string;
  accent?: string; // tailwind gradient
};

const ITEMS: Item[] = [
  {
    id: 'profitability',
    title: 'سودآوری کالاها',
    description: 'سود ناخالص، حاشیه سود و کالاهای برتر/ضعیف را با جزئیات ببینید.',
    icon: 'fa-solid fa-sack-dollar',
    path: '/reports/analysis/profitability',
    tag: 'Profit',
    accent: 'from-indigo-500 to-violet-600',
  },
  {
    id: 'inventory',
    title: 'تحلیل وضعیت انبار',
    description: 'کالاهای داغ/عادی/راکد بر اساس سرعت فروش و موجودی فعلی.',
    icon: 'fa-solid fa-boxes-stacked',
    path: '/reports/analysis/inventory',
    tag: 'Inventory',
    accent: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'suggestions',
    title: 'پیشنهادهای هوشمند خرید',
    description: 'کالاهای رو به اتمام + تعداد پیشنهادی برای خرید با اولویت‌بندی.',
    icon: 'fa-solid fa-lightbulb',
    path: '/reports/analysis/suggestions',
    tag: 'Reorder',
    accent: 'from-rose-500 to-orange-500',
  },
  {
    id: 'phone-sales',
    title: 'گزارش فروش نقدی موبایل',
    description: 'خرید/فروش/سود گوشی‌های موبایل در فروش‌های عادی (نقدی و اعتباری).',
    icon: 'fa-solid fa-cash-register',
    path: '/reports/phone-sales',
    tag: 'Mobile',
    accent: 'from-sky-500 to-blue-600',
  },
  {
    id: 'phone-installment-sales',
    title: 'گزارش فروش اقساطی موبایل',
    description: 'گزارش مالی فروش اقساطی موبایل به همراه سود کل هر معامله.',
    icon: 'fa-solid fa-file-invoice-dollar',
    path: '/reports/phone-installment-sales',
    tag: 'Installment',
    accent: 'from-fuchsia-500 to-purple-600',
  },
];

function Card({ item }: { item: Item }) {
  return (
    <Link
      to={item.path}
      className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-slate-950/30"
    >
      <div className={`pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${item.accent ?? 'from-primary-500 to-primary-700'} opacity-20 blur-2xl`} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${item.accent ?? 'from-primary-500 to-primary-700'} text-white shadow-md`}>
            <i className={item.icon} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-base font-extrabold text-slate-900 dark:text-slate-100">{item.title}</div>
              {item.tag ? (
                <span className="rounded-full border border-slate-200/70 bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  {item.tag}
                </span>
              ) : null}
            </div>
            <div className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{item.description}</div>
          </div>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white/70 text-slate-700 shadow-sm transition group-hover:scale-[1.03] dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
          <i className="fa-solid fa-arrow-left" />
        </div>
      </div>
    </Link>
  );
}

const AnalysisHub: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  useEffect(() => {
    if (currentUser && currentUser.roleName === 'Salesperson') {
      setNotification({ type: 'error', text: 'شما اجازه دسترسی به این صفحه را ندارید.' });
      navigate('/');
    }
  }, [currentUser, navigate]);

  const items = useMemo(() => ITEMS, []);

  if (currentUser && currentUser.roleName === 'Salesperson') return null;

  return (
    <div className="report-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <ModernReportShell
        title="تحلیل هوشمند"
        subtitle="گزارش‌های تصمیم‌ساز برای سود، انبار و فروش. اینجا قرار است با چند کلیک به «چی کار کنیم؟» برسید."
        icon="fa-solid fa-brain"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((it) => (
            <Card key={it.id} item={it} />
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white/60 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          <div className="font-bold text-slate-800 dark:text-slate-100">نکته</div>
          <div className="mt-1">
            برای حرفه‌ای‌تر شدن تحلیل‌ها، داده‌های قیمت خرید/فروش و موجودی را دقیق نگه دارید؛ گزارش‌ها روی همین‌ها «سود واقعی» می‌سازند.
          </div>
        </div>
      </ModernReportShell>
    </div>
  );
};

export default AnalysisHub;
