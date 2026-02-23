import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SmsPatternDef } from './SmsBulkTestModal';

type HealthItem = {
  key: string;
  label: string;
  category: string;
  configured: boolean;
  bodyId: number | null;
};

type HealthResponse = {
  success: boolean;
  provider?: string;
  credsOk?: boolean;
  message?: string;
  items?: HealthItem[];
};

type Props = {
  patterns: SmsPatternDef[];
  onOpenBulkTest: (defaultSelectedKeys: string[]) => void;
};

const SmsHealthCheckPanel: React.FC<Props> = ({ patterns, onOpenBulkTest }) => {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<HealthResponse | null>(null);
  const [expanded, setExpanded] = useState(true);

  const load = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/sms/health-check', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      setData(json);
    } catch (e: any) {
      setData({ success: false, message: e?.message || 'خطای شبکه در Health Check' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // فقط در زمانی که پنل دیده می‌شود و توکن داریم، یکبار لود کن
    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const merged = useMemo(() => {
    const map = new Map<string, HealthItem>();
    (data?.items || []).forEach((x) => map.set(x.key, x));
    return patterns.map((p) => {
      const it = map.get(p.key);
      return {
        key: p.key,
        label: p.label,
        category: p.category,
        configured: it ? !!it.configured : false,
        bodyId: it?.bodyId ?? null,
      };
    });
  }, [data, patterns]);

  const grouped = useMemo(() => {
    const g: Record<string, HealthItem[]> = {};
    merged.forEach((x) => {
      g[x.category] = g[x.category] || [];
      g[x.category].push(x);
    });
    return g;
  }, [merged]);

  const missingKeys = useMemo(() => merged.filter((x) => !x.configured).map((x) => x.key), [merged]);
  const okCount = merged.filter((x) => x.configured).length;
  const total = merged.length;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/40 p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200 border border-emerald-200/60 dark:border-emerald-900/30">
              <i className="fa-solid fa-shield-heart" />
            </span>
            Health Check پیامک‌ها
          </div>
          <div className="app-subtle mt-1">
            وضعیت تنظیم بودن پترن‌ها + تست گروهی. ({okCount}/{total} فعال)
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="px-3 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            <i className={`fa-solid ${expanded ? 'fa-chevron-up' : 'fa-chevron-down'} ml-1`} />
            {expanded ? 'جمع کردن' : 'باز کردن'}
          </button>
          <button
            type="button"
            onClick={load}
            className="px-3 py-2 rounded-xl bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
          >
            <i className={`fa-solid ${isLoading ? 'fa-rotate fa-spin' : 'fa-rotate'} ml-1`} />
            {isLoading ? 'در حال بررسی...' : 'بررسی دوباره'}
          </button>
          <button
            type="button"
            onClick={() => onOpenBulkTest(missingKeys.length ? missingKeys : merged.map((x) => x.key))}
            className="px-3 py-2 rounded-xl bg-primary text-white hover:brightness-110"
          >
            <i className="fa-solid fa-vials ml-1" />
            تست گروهی
          </button>
        </div>
      </div>

      {data && data.success === false ? (
        <div className="mt-3 rounded-xl p-3 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200">
          {data.message || 'Health Check ناموفق بود.'}
        </div>
      ) : null}

      {data && data.success && data.credsOk === false ? (
        <div className="mt-3 rounded-xl p-3 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
          <i className="fa-solid fa-triangle-exclamation ml-2" />
          نام کاربری/رمز عبور ملی پیامک در تنظیمات وارد نشده است.
        </div>
      ) : null}

      {expanded ? (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.keys(grouped).map((cat) => {
            const items = grouped[cat];
            const ok = items.filter((x) => x.configured).length;
            return (
              <div key={cat} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-3 bg-white/40 dark:bg-gray-900/10">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    <i className="fa-solid fa-layer-group ml-2" />
                    {cat}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">{ok}/{items.length}</span>
                </div>
                <div className="mt-2 space-y-2">
                  {items.map((x) => (
                    <div key={x.key} className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm">{x.label}</div>
                      <span className={`text-xs px-2 py-1 rounded-lg ${x.configured ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200' : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200'}`}>
                        <i className={`fa-solid ${x.configured ? 'fa-circle-check' : 'fa-circle-xmark'} ml-1`} />
                        {x.configured ? 'تنظیم شده' : 'تنظیم نشده'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default SmsHealthCheckPanel;
