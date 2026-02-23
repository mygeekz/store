import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import Skeleton from '../components/ui/Skeleton';
import TelegramTopicPanel from '../components/TelegramTopicPanel';

type KPIs = {
  monthSalesTotal?: number;
  monthOrdersTotal?: number;
  monthCashOnlyTotal?: number;
  todaySalesCount?: number;
  todayOrdersCount?: number;
};

/**
 * هاب فروش
 * - اگر از صفحات دیگر با state.prefillItem به /sales آمده باشیم،
 *   به صورت خودکار به فروش نقدی هدایت می‌شود تا رفتار قبلی حفظ شود.
 */
const SalesHub: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { token } = useAuth();

  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loadingKpis, setLoadingKpis] = useState(false);
  const [tab, setTab] = useState<'main' | 'telegram'>('main');

  useEffect(() => {
    // سازگاری: صفحات محصولات/خدمات و ... فروش نقدی را با state.prefillItem صدا می‌زنند.
    if (location?.state?.prefillItem) {
      navigate('/sales/cash', { state: location.state, replace: true });
    }
  }, [location?.state, navigate]);

  useEffect(() => {
    if (!token) return;
    setLoadingKpis(true);
    apiFetch('/api/dashboard/summary?period=monthly')
      .then((r) => r.json())
      .then((j) => {
        if (j?.success === true) {
          const raw = j?.data?.kpis || {};
          setKpis({
            monthSalesTotal: Number(raw?.monthlySalesTotal ?? raw?.monthSalesTotal ?? 0) || 0,
            monthOrdersTotal: Number(raw?.monthlyOrdersTotal ?? raw?.monthOrdersTotal ?? 0) || 0,
            monthCashOnlyTotal: Number(raw?.monthlyCashOnlyTotal ?? raw?.monthCashOnlyTotal ?? 0) || 0,
            todaySalesCount: Number(raw?.todaySalesCount ?? 0) || 0,
            todayOrdersCount: Number(raw?.todayOrdersCount ?? 0) || 0,
          });
        }
      })
      .catch(() => {
        // ignore: UI باید حتی بدون KPI هم کار کند
      })
      .finally(() => setLoadingKpis(false));
  }, [token]);

  const f = useMemo(() => (n: number) => (Number(n) || 0).toLocaleString('fa-IR'), []);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 text-right">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
              فروش
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              صندوق فروش، فروش اقساطی و مدیریت فاکتورها.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-white/5 transition"
            >
              <i className="fa-solid fa-users ml-2 opacity-80" />
              مشتریان
            </button>
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-white/5 transition"
            >
              <i className="fa-solid fa-boxes-stacked ml-2 opacity-80" />
              کالاها
            </button>
          </div>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab('main')}
          className={`px-3 py-2 rounded-xl text-sm border transition ${tab === 'main'
            ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
            : 'bg-white dark:bg-gray-900 border-gray-200/70 dark:border-gray-800 text-gray-800 dark:text-gray-100'}`}
        >
          فروش
        </button>
        <button
          type="button"
          onClick={() => setTab('telegram')}
          className={`px-3 py-2 rounded-xl text-sm border transition ${tab === 'telegram'
            ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
            : 'bg-white dark:bg-gray-900 border-gray-200/70 dark:border-gray-800 text-gray-800 dark:text-gray-100'}`}
        >
          ارسال‌های تلگرام
        </button>
      </div>

      {tab === 'telegram' ? (
        <TelegramTopicPanel
          topic="sales"
          title="ارسال‌های تلگرام (فروش)"
          allowedTypes={[
            { key: 'SALES_ORDER_CREATED', label: 'فاکتور جدید' },
            { key: 'SALES_ORDER_RETURN_CREATED', label: 'مرجوعی' },
            { key: 'SALES_ORDER_CANCELLED', label: 'ابطال/کنسلی' },
          ]}
        />
      ) : (

      <div className="mb-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        {(loadingKpis || !kpis) ? (
          <>
            <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"><Skeleton className="h-16" /></div>
            <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"><Skeleton className="h-16" /></div>
            <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"><Skeleton className="h-16" /></div>
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
              <div className="text-xs text-gray-500 dark:text-gray-400">فروش این ماه</div>
              <div className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
                {f(kpis.monthSalesTotal || 0)} <span className="text-sm font-semibold text-gray-500">تومان</span>
              </div>
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                مجموع فروش نقدی + سفارش‌ها
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
              <div className="text-xs text-gray-500 dark:text-gray-400">سفارش‌های این ماه</div>
              <div className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
                {f(kpis.monthOrdersTotal || 0)} <span className="text-sm font-semibold text-gray-500">تومان</span>
              </div>
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                فروش ثبت‌شده در سفارش‌ها
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
              <div className="text-xs text-gray-500 dark:text-gray-400">عملکرد امروز</div>
              <div className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
                {f((kpis.todaySalesCount || 0) + (kpis.todayOrdersCount || 0))}
                <span className="text-sm font-semibold text-gray-500 mr-2">ثبت</span>
              </div>
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                نقدی: {f(kpis.todaySalesCount || 0)} · سفارش: {f(kpis.todayOrdersCount || 0)}
              </div>
            </div>
          </>
        )}
      </div>

      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => navigate('/sales/cash')}
          className={[
            'group rounded-2xl p-5 text-right border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
            'hover:border-primary/40 hover:shadow-lg transition-all',
          ].join(' ')}
        >
          <div className="flex items-center gap-3">
            <span className="h-12 w-12 rounded-2xl grid place-items-center text-white bg-gradient-to-br from-primary-500 to-primary-600 shadow-sm">
              <i className="fa-solid fa-money-bill-wave text-lg" />
            </span>
            <div className="flex-1">
              <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                فروش نقدی
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                ثبت سریع فاکتور و مدیریت سبد خرید
              </div>
            </div>
            <i className="fa-solid fa-arrow-left text-gray-400 group-hover:text-primary transition-colors" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/installment-sales')}
          className={[
            'group rounded-2xl p-5 text-right border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
            'hover:border-primary/40 hover:shadow-lg transition-all',
          ].join(' ')}
        >
          <div className="flex items-center gap-3">
            <span className="h-12 w-12 rounded-2xl grid place-items-center text-white bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-sm">
              <i className="fa-solid fa-file-invoice-dollar text-lg" />
            </span>
            <div className="flex-1">
              <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                فروش اقساطی
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                ثبت قرارداد اقساط، چک‌ها و پیگیری پرداخت‌ها
              </div>
            </div>
            <i className="fa-solid fa-arrow-left text-gray-400 group-hover:text-primary transition-colors" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/invoices')}
          className={[
            'group rounded-2xl p-5 text-right border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
            'hover:border-primary/40 hover:shadow-lg transition-all',
          ].join(' ')}
        >
          <div className="flex items-center gap-3">
            <span className="h-12 w-12 rounded-2xl grid place-items-center text-white bg-gradient-to-br from-rose-500 to-red-600 shadow-sm">
              <i className="fa-solid fa-file-invoice text-lg" />
            </span>
            <div className="flex-1">
              <div className="text-base font-semibold text-gray-900 dark:text-gray-100">فاکتورها</div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                مشاهده و چاپ فاکتورهای ثبت‌شده
              </div>
            </div>
            <i className="fa-solid fa-arrow-left text-gray-400 group-hover:text-primary transition-colors" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default SalesHub;
