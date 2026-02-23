// pages/Dashboard.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import moment from 'jalali-moment';
import { Link } from 'react-router-dom';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';

import type {
  SalesDataPoint,
  ChartTimeframe,
  DashboardAPIData,
  NotificationMessage,
  Product,
  PhoneEntry,
  InstallmentCalendarItem,
} from '../types';

import Notification from '../components/Notification';
import LiquidGlassPanel from '../components/LiquidGlassPanel';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { apiFetch } from '../utils/apiFetch';

import AddWidgetModal from './dashboard/AddWidgetModal';
import WidgetShell from './dashboard/WidgetShell';
import { DEFAULT_DASHBOARD_LAYOUT, type DashboardLayoutV2 } from './dashboard/defaultLayouts';
import { ALL_WIDGETS, WIDGET_REGISTRY, type WidgetId, type SizePreset, PRESET_SIZE } from './dashboard/registry';
import type { ChartVariant, DashboardWidgetContext } from './dashboard/types';

const ResponsiveGridLayout = WidthProvider(Responsive);

// --------------------
// Format helpers
// --------------------
const formatPriceForStats = (value: number): string => {
  if (value === undefined || value === null) return '۰ تومان';
  return Number(value || 0).toLocaleString('fa-IR') + ' تومان';
};
const formatNumberForStats = (value: number): string => {
  if (value === undefined || value === null) return '۰';
  return Number(value || 0).toLocaleString('fa-IR');
};


// --------------------
// Premium metric card
// --------------------
const MetricCard: React.FC<{
  titleFa: string;
  titleEn: string;
  value: string;
  icon: string;
  tone?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'sky' | 'purple';
  loading?: boolean;
}> = ({ titleFa, titleEn, value, icon, tone = 'indigo', loading }) => {
  const tones: Record<string, { ring: string; grad: string; badge: string }> = {
    indigo: {
      ring: 'ring-indigo-500/15',
      grad: 'from-indigo-500/10 via-fuchsia-500/5 to-transparent',
      badge: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-200',
    },
    emerald: {
      ring: 'ring-emerald-500/15',
      grad: 'from-emerald-500/10 via-teal-500/5 to-transparent',
      badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
    },
    rose: {
      ring: 'ring-rose-500/15',
      grad: 'from-rose-500/10 via-pink-500/5 to-transparent',
      badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-200',
    },
    amber: {
      ring: 'ring-amber-500/15',
      grad: 'from-amber-500/10 via-orange-500/5 to-transparent',
      badge: 'bg-amber-500/10 text-amber-800 dark:text-amber-200',
    },
    sky: {
      ring: 'ring-sky-500/15',
      grad: 'from-sky-500/10 via-blue-500/5 to-transparent',
      badge: 'bg-sky-500/10 text-sky-800 dark:text-sky-200',
    },
    purple: {
      ring: 'ring-purple-500/15',
      grad: 'from-purple-500/10 via-fuchsia-500/5 to-transparent',
      badge: 'bg-purple-500/10 text-purple-800 dark:text-purple-200',
    },
  };

  const t = tones[tone];

  return (
    <div
      className={[
        'relative overflow-hidden rounded-3xl p-4',
        'bg-white/70 dark:bg-gray-950/35',
        'shadow-[0_10px_40px_-20px_rgba(0,0,0,0.35)]',
        'ring-1 ring-black/5 dark:ring-white/10',
        t.ring,
      ].join(' ')}
    >
      <div className={['absolute inset-0 bg-gradient-to-br', t.grad].join(' ')} />
      <div className="absolute -top-10 -left-10 w-28 h-28 rounded-full bg-white/30 dark:bg-white/10 blur-2xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="text-right">
          <div className="text-[12px] font-extrabold text-gray-900 dark:text-gray-100">{titleFa}</div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 -mt-0.5">{titleEn}</div>
        </div>

        <div
          className={[
            'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0',
            'bg-gradient-to-br from-black/5 to-black/0 dark:from-white/10 dark:to-white/0',
            'ring-1 ring-black/5 dark:ring-white/10',
            t.badge,
          ].join(' ')}
        >
          <i className={[icon, 'text-[16px]'].join(' ')} />
        </div>
      </div>

      <div className="relative mt-3">
        {loading ? (
          <div className="h-7 w-36 rounded-xl bg-gray-200/70 dark:bg-white/10 animate-pulse" />
        ) : (
          <div className="text-[18px] md:text-[20px] font-black text-gray-900 dark:text-gray-100 tracking-tight">{value}</div>
        )}
      </div>
    </div>
  );
};

// --- Helpers for chart normalization ---
const toEnglishDigits = (str: any): string => {
  const s = String(str ?? '');
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  const ar = '٠١٢٣٤٥٦٧٨٩';
  return s.replace(/[۰-۹]/g, (d) => String(fa.indexOf(d))).replace(/[٠-٩]/g, (d) => String(ar.indexOf(d)));
};

const extractNumeric = (v: any): number => {
  if (v == null) return 0;
  if (typeof v === 'object') {
    const k = ['sales', 'value', 'amount', 'total', 'sum', 'revenue', 'count', 'price', 'num'].find((key) =>
      Object.prototype.hasOwnProperty.call(v, key),
    );
    if (k) return extractNumeric((v as any)[k]);
    return 0;
  }
  if (typeof v === 'number' && Number.isFinite(v)) return v;

  const s0 = toEnglishDigits(v);
  const s1 = s0
    .replace(/[,،\s]/g, '')
    .replace(/تومان|ريال|ریال|IRR|IRT|tomans?|toman|rial/gi, '')
    .replace(/[^\d.-]/g, '');

  const n = Number(s1);
  return Number.isFinite(n) ? n : 0;
};

const faDateLabel = (raw: any, timeframe: ChartTimeframe['key']) => {
  const s = String(raw ?? '').trim();
  if (!s) return '—';

  const isoFormats = [moment.ISO_8601, 'YYYY-MM-DD', 'YYYY/MM/DD'].filter(Boolean) as any;
  const mIso: any = moment(s, isoFormats, true);
  const mJal: any = moment(s, 'jYYYY/jMM/jDD', true);

  const m = mIso?.isValid?.() ? mIso : mJal?.isValid?.() ? mJal : null;
  if (!m) return s;

  const fmt =
    timeframe === 'weekly'
      ? 'jMM/jDD'
      : timeframe === 'monthly'
      ? 'jMMM'
      : timeframe === 'yearly'
      ? 'jYYYY'
      : 'jMM/jDD';

  return m.locale('fa').format(fmt);
};

const parseToMoment = (raw: any) => {
  const s = String(raw ?? '').trim();
  if (!s) return null;

  const isoFormats = [moment.ISO_8601, 'YYYY-MM-DD', 'YYYY/MM/DD'].filter(Boolean) as any;
  const mIso: any = moment(s, isoFormats, true);
  if (mIso?.isValid?.()) return mIso;

  const mJal: any = moment(s, 'jYYYY/jMM/jDD', true);
  return mJal?.isValid?.() ? mJal : null;
};

const normalizeSalesChartData = (raw: any, timeframe: ChartTimeframe['key']): SalesDataPoint[] => {
  if (!raw) return [];
  if (raw.data && Array.isArray(raw.data)) raw = raw.data;

  if (!Array.isArray(raw) && typeof raw === 'object') {
    const arr = Object.entries(raw).map(([key, val]) => {
      const m = parseToMoment(key);
      const ts = m ? m.valueOf() : 0;
      return { _rawKey: key, _ts: ts, name: faDateLabel(key, timeframe), sales: extractNumeric(val) } as any;
    });

    const validCount = arr.filter((it) => it._ts).length;
    if (validCount >= Math.max(1, Math.floor(arr.length * 0.6))) arr.sort((a, b) => a._ts - b._ts);
    else arr.sort((a, b) => String(a._rawKey).localeCompare(String(b._rawKey)));

    return arr.map(({ name, sales }) => ({ name, sales }));
  }

  if (Array.isArray(raw)) {
    const normalized = raw
      .map((it: any) => {
        const key = it?.date ?? it?.day ?? it?.label ?? it?.name ?? it?.x ?? it?._rawKey ?? '';
        const val = it?.sales ?? it?.value ?? it?.amount ?? it?.total ?? it?.sum ?? it?.revenue ?? it?.y ?? it?.num ?? 0;
        const m = parseToMoment(key);
        const ts = m ? m.valueOf() : 0;
        return { _ts: ts, name: faDateLabel(key, timeframe), sales: extractNumeric(val) } as any;
      })
      .filter((x) => x.name);

    const validCount = normalized.filter((it) => it._ts).length;
    if (validCount >= Math.max(1, Math.floor(normalized.length * 0.6))) normalized.sort((a, b) => a._ts - b._ts);

    return normalized.map(({ name, sales }) => ({ name, sales }));
  }

  return [];
};

// --------------------
// Layout helpers
// --------------------
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

const ensureMandatory = (order: WidgetId[]) => {
  const mustHave = Object.values(WIDGET_REGISTRY)
    .filter((w) => w.canRemove === false)
    .map((w) => w.id);

  const set = new Set(order);
  const next = [...order];
  for (const id of mustHave) if (!set.has(id)) next.push(id);
  return next;
};

const cyclePreset = (current: SizePreset): SizePreset => {
  const list: SizePreset[] = ['tile', 'wide', 'tall', 'hero'];
  const idx = Math.max(0, list.indexOf(current));
  return list[(idx + 1) % list.length];
};

// ساخت layout اولیه برای RGL از order + sizes (Packed به سبک masonry برای پر کردن gap ها)
const buildPackedLayout = (order: WidgetId[], sizes: Record<string, SizePreset>, cols: number): Layout[] => {
  const heights = Array.from({ length: cols }, () => 0); // ارتفاع هر ستون
  const out: Layout[] = [];

  const spanMax = (start: number, w: number) => {
    let m = 0;
    for (let i = start; i < start + w; i++) m = Math.max(m, heights[i] || 0);
    return m;
  };

  const place = (w: number, h: number) => {
    // بهترین نقطه = کمترین y ممکن؛ در تساوی، کمترین x
    let bestX = 0;
    let bestY = Number.POSITIVE_INFINITY;

    for (let x = 0; x <= cols - w; x++) {
      const y = spanMax(x, w);
      if (y < bestY || (y === bestY && x < bestX)) {
        bestY = y;
        bestX = x;
      }
    }

    // آپدیت ارتفاع ستون‌ها
    for (let i = bestX; i < bestX + w; i++) heights[i] = bestY + h;

    return { x: bestX, y: bestY };
  };

  for (const id of order) {
    const def = WIDGET_REGISTRY[id];
    if (!def) continue;

    const preset = (sizes[id] || def.defaultPreset) as SizePreset;
    const ps = PRESET_SIZE[preset] || PRESET_SIZE.tile;

    const w = Math.min(ps.w, cols);
    const minHWanted = Math.max(ps.minH || 1, (def.constraints as any)?.minH || 0);
    const maxHWanted = (def.constraints as any)?.maxH ? Math.max((def.constraints as any).maxH, minHWanted) : undefined;
    const h = Math.max(ps.h, minHWanted);

    const pos = place(w, h);

    const item: Layout = {
      i: id,
      x: pos.x,
      y: pos.y,
      w,
      h,
      minW: ps.minW,
      minH: ps.minH,
      ...(def.constraints || {}),
      ...(maxHWanted ? { maxH: maxHWanted } : {}),
      ...(ps.minW > cols ? { minW: Math.max(1, cols) } : {}),
      ...(w > cols ? { w: cols } : {}),
    };

    out.push(item);
  }

  return out;
};


const sortOrderFromLayout = (layoutArr: Layout[]): WidgetId[] => {
  return layoutArr
    .slice()
    .sort((a, b) => (a.y - b.y) || (a.x - b.x) || String(a.i).localeCompare(String(b.i)))
    .map((l) => l.i as WidgetId);
};

const DASHBOARD_LAYOUT_ENDPOINT = '/api/dashboard/layout';
const DASHBOARD_LAYOUT_LS_PREFIX = 'dashboard:layouts:v2:';

const Dashboard: React.FC = () => {
  const { token, logout, isLoading: authProcessLoading, authReady, currentUser } = useAuth();
  const { theme } = useTheme();

  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  // Dashboard summary
  const [dashboardData, setDashboardData] = useState<DashboardAPIData | null>(null);
  const [productSalesLoading, setProductSalesLoading] = useState<boolean>(false);
  const [productSalesTotal, setProductSalesTotal] = useState<number>(0);

  const [localIsLoading, setLocalIsLoading] = useState<boolean>(true);
  const [activeTimeframe, setActiveTimeframe] = useState<ChartTimeframe['key']>('weekly');
  const [chartStyle, setChartStyle] = useState<ChartVariant>('aurora');

  // Asset card
  const [assetLoading, setAssetLoading] = useState<boolean>(false);
  const [assetValue, setAssetValue] = useState<number>(0);
  const [assetBreakdown, setAssetBreakdown] = useState<{ productsValue: number; phonesValue: number; itemsCount: number }>({
    productsValue: 0,
    phonesValue: 0,
    itemsCount: 0,
  });

  // Upcoming due items
  const [dueLoading, setDueLoading] = useState(false);
  const [dueItems, setDueItems] = useState<InstallmentCalendarItem[]>([]);
  const [dueRange, setDueRange] = useState<{ from: string; to: string } | null>(null);

  const isDark = theme === 'dark';
  const showLoadingSkeletons = authProcessLoading || (!authReady && !token) || (localIsLoading && authReady && token);

  // --- Dashboard customization state ---
  const [editing, setEditing] = useState(false);
  const [layout, setLayout] = useState<DashboardLayoutV2>(DEFAULT_DASHBOARD_LAYOUT);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const saveTimer = useRef<number | null>(null);
  const lastSavedHash = useRef<string>('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveStateTimer = useRef<number | null>(null);

  const layoutStorageKey = useMemo(() => {
    const uid = (currentUser as any)?.id ?? 'anon';
    return `${DASHBOARD_LAYOUT_LS_PREFIX}${uid}`;
  }, [currentUser]);

  

  // Product-only sales card (inventory items) for current Shamsi month
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        setProductSalesLoading(true);
        const nowJ = moment().locale('fa');
        const from = nowJ.clone().startOf('jMonth').format('jYYYY/jMM/jDD');
        const to = nowJ.clone().endOf('jMonth').format('jYYYY/jMM/jDD');

        const res = await apiFetch(`/api/reports/financial-overview?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
        const js = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && js?.success !== false) {
          const v = Number(js?.data?.sales?.productSalesTotal ?? 0);
          setProductSalesTotal(Number.isFinite(v) ? v : 0);
        }
      } catch {
        // no access / network issue -> keep card at 0
      } finally {
        if (!cancelled) setProductSalesLoading(false);
      }
    })();
    return () => {
      cancelled = true
    };
  }, [token]);

const ctx: DashboardWidgetContext = useMemo(
    () => ({
      token,
      authReady,
      isDark,
      showLoadingSkeletons,
      dashboardData,
      activeTimeframe,
      setActiveTimeframe,
      chartStyle,
      setChartStyle,
      assetLoading,
      assetValue,
      assetBreakdown,
      dueLoading,
      dueItems,
      dueRange,
      productSalesLoading,
      productSalesTotal,
      formatPrice: formatPriceForStats,
      formatNumber: formatNumberForStats,
    }),
    [
      token,
      authReady,
      isDark,
      showLoadingSkeletons,
      dashboardData,
      activeTimeframe,
      chartStyle,
      assetLoading,
      assetValue,
      assetBreakdown,
      dueLoading,
      dueItems,
      dueRange,
      productSalesLoading,
      productSalesTotal,
    ],
  );

  // Widgets currently on dashboard
  const usedWidgetIds = useMemo(() => layout.order.filter((id) => Boolean(WIDGET_REGISTRY[id])), [layout.order]);

  const availableToAdd = useMemo(() => {
    const used = new Set(usedWidgetIds);
    return ALL_WIDGETS.filter((w) => !used.has(w.id));
  }, [usedWidgetIds]);

  const scheduleSave = (nextLayout: DashboardLayoutV2) => {
    // local cache
    try {
      localStorage.setItem(layoutStorageKey, JSON.stringify(nextLayout));
    } catch {
      // ignore
    }

    if (!token) return;

    const payload = JSON.stringify(nextLayout);
    if (payload === lastSavedHash.current) return;

    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setSaveState('saving');
      try {
        const res = await apiFetch(DASHBOARD_LAYOUT_ENDPOINT, {
          method: 'PUT',
          body: JSON.stringify({ layouts: nextLayout }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'خطا در ذخیره چیدمان داشبورد');

        lastSavedHash.current = payload;
        setSaveState('saved');
        if (saveStateTimer.current) window.clearTimeout(saveStateTimer.current);
        saveStateTimer.current = window.setTimeout(() => setSaveState('idle'), 1400);
      } catch (e: any) {
        setSaveState('error');
        setNotification({ type: 'warning', text: e?.message || 'ذخیره چیدمان داشبورد با خطا مواجه شد.' });
      }
    }, 650);
  };

  const normalizeLayoutV2 = (raw: any): DashboardLayoutV2 => {
    const def = DEFAULT_DASHBOARD_LAYOUT;

    if (raw && typeof raw === 'object' && raw.version === 2) {
      const order = Array.isArray(raw.order) ? raw.order.map(String) : [];
      const cleaned = order.filter((id) => Boolean(WIDGET_REGISTRY[id as WidgetId])) as WidgetId[];
      const unique = uniq(cleaned);
      const withMust = ensureMandatory(unique);

      const sizesRaw = raw.sizes && typeof raw.sizes === 'object' ? raw.sizes : {};
      const sizes: Record<string, SizePreset> = { ...def.sizes };
      for (const id of withMust) {
        const s = sizesRaw[id];
        const preset = (['tile', 'wide', 'tall', 'hero'] as const).includes(s) ? (s as SizePreset) : undefined;
        sizes[id] = preset || sizes[id] || WIDGET_REGISTRY[id].defaultPreset;
      }
      return { version: 2, order: withMust.length ? withMust : def.order, sizes };
    }

    return def;
  };

  const loadLayout = async () => {
    if (!token) return;

    // local fast path
    try {
      const cached = localStorage.getItem(layoutStorageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const normalized = normalizeLayoutV2(parsed);
        setLayout(normalized);
        lastSavedHash.current = JSON.stringify(normalized);
      }
    } catch {
      // ignore
    }

    try {
      const res = await apiFetch(DASHBOARD_LAYOUT_ENDPOINT);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'خطا در دریافت چیدمان داشبورد');

      const loaded = json?.data?.layouts ?? json?.data ?? null;
      if (loaded) {
        const normalized = normalizeLayoutV2(loaded);
        setLayout(normalized);
        lastSavedHash.current = JSON.stringify(normalized);
        try {
          localStorage.setItem(layoutStorageKey, JSON.stringify(normalized));
        } catch {}
      } else {
        setLayout(DEFAULT_DASHBOARD_LAYOUT);
        lastSavedHash.current = JSON.stringify(DEFAULT_DASHBOARD_LAYOUT);
        try {
          localStorage.setItem(layoutStorageKey, JSON.stringify(DEFAULT_DASHBOARD_LAYOUT));
        } catch {}
      }
    } catch (e: any) {
      setLayout(DEFAULT_DASHBOARD_LAYOUT);
      setNotification({ type: 'warning', text: e?.message || 'چیدمان داشبورد بارگذاری نشد (از حالت پیش‌فرض استفاده شد).' });
    } finally {
      setLayoutLoaded(true);
    }
  };

  const resetLayout = () => {
    setLayout(DEFAULT_DASHBOARD_LAYOUT);
    scheduleSave(DEFAULT_DASHBOARD_LAYOUT);
  };

  const toggleEditing = () => {
    setEditing((prev) => {
      const next = !prev;
      if (prev && !next) scheduleSave(layout);
      return next;
    });
  };

  const addWidget = (id: WidgetId) => {
    const def = WIDGET_REGISTRY[id];
    if (!def) return;

    setLayout((prev) => {
      if (prev.order.includes(id)) return prev;
      const next: DashboardLayoutV2 = {
        version: 2,
        order: ensureMandatory([...prev.order, id]),
        sizes: { ...prev.sizes, [id]: prev.sizes[id] || def.defaultPreset },
      };
      scheduleSave(next);
      return next;
    });

    setAddModalOpen(false);
  };

  const removeWidget = (id: WidgetId) => {
    const def = WIDGET_REGISTRY[id];
    if (def && def.canRemove === false) return;

    setLayout((prev) => {
      const next: DashboardLayoutV2 = {
        version: 2,
        order: ensureMandatory(prev.order.filter((x) => x !== id)),
        sizes: { ...prev.sizes },
      };
      scheduleSave(next);
      return next;
    });
  };

  const toggleSize = (id: WidgetId) => {
    setLayout((prev) => {
      const current = prev.sizes[id] || WIDGET_REGISTRY[id]?.defaultPreset || 'tile';
      const nextSize = cyclePreset(current);
      const next: DashboardLayoutV2 = {
        version: 2,
        order: prev.order,
        sizes: { ...prev.sizes, [id]: nextSize },
      };
      scheduleSave(next);
      return next;
    });
  };

  // --------------------
  // Data fetchers
  // --------------------
  const fetchDashboardData = async (period: ChartTimeframe['key']) => {
    if (!token) return;
    setLocalIsLoading(true);
    try {
      const res = await apiFetch(`/api/dashboard/summary?period=${period}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت خلاصه داشبورد');

      const normalizedChart = normalizeSalesChartData(json.data?.salesChartData, period);

      setDashboardData({
        kpis: json.data?.kpis,
        recentActivities: json.data?.recentActivities,
        salesChartData: normalizedChart,
      });
    } catch (error: any) {
      let displayMessage = 'یک خطای پیش‌بینی نشده در دریافت اطلاعات داشبورد رخ داد.';
      if (error.message) {
        if (error.message.includes('۴۰۳') || error.message.includes('توکن') || error.message.toLowerCase().includes('unauthorized')) {
          displayMessage = 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید.';
          logout();
        } else if (error.message.toLowerCase().includes('failed to fetch')) {
          displayMessage = 'خطا در ارتباط با سرور. اتصال اینترنت خود را بررسی کنید.';
        } else {
          displayMessage = error.message;
        }
      }
      setNotification({ type: 'error', text: displayMessage });
      setDashboardData(null);
    } finally {
      setLocalIsLoading(false);
    }
  };

  const fetchAssets = async () => {
    if (!token) return;
    setAssetLoading(true);
    try {
      const [prodRes, phoneRes] = await Promise.all([apiFetch('/api/products'), apiFetch('/api/phones')]);
      const [prodJson, phoneJson] = await Promise.all([prodRes.json(), phoneRes.json()]);

      if (!prodRes.ok || !prodJson.success) throw new Error(prodJson.message || 'خطا در دریافت محصولات');
      if (!phoneRes.ok || !phoneJson.success) throw new Error(phoneJson.message || 'خطا در دریافت گوشی‌ها');

      const products: Product[] = prodJson.data || [];
      const phones: PhoneEntry[] = phoneJson.data || [];

      const productsValue = products.reduce((sum, p) => sum + ((p.purchasePrice ?? 0) * (p.stock_quantity ?? 0)), 0);
      const productsCount = products.reduce((sum, p) => sum + (p.stock_quantity ?? 0), 0);

      const phonesInStock = phones.filter((ph) => ph.status === 'موجود در انبار');
      const phonesValue = phonesInStock.reduce((sum, ph) => sum + (Number(ph.purchasePrice ?? ph.salePrice) || 0), 0);
      const phonesCount = phonesInStock.length;

      const total = productsValue + phonesValue;
      setAssetValue(total);
      setAssetBreakdown({
        productsValue,
        phonesValue,
        itemsCount: productsCount + phonesCount,
      });
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'خطا در محاسبه دارایی.' });
      setAssetValue(0);
      setAssetBreakdown({ productsValue: 0, phonesValue: 0, itemsCount: 0 });
    } finally {
      setAssetLoading(false);
    }
  };

  const fetchUpcomingDue = async () => {
    if (!token) return;
    setDueLoading(true);
    try {
      const fromJ = moment().locale('fa').format('jYYYY/jMM/jDD');
      const toJ = moment().locale('fa').add(14, 'day').format('jYYYY/jMM/jDD');
      setDueRange({ from: fromJ, to: toJ });

      const res = await apiFetch(`/api/reports/installments-calendar?from=${encodeURIComponent(fromJ)}&to=${encodeURIComponent(toJ)}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت تقویم اقساط');

      const items: InstallmentCalendarItem[] = json.data?.items || [];

      const filtered = items.filter((it) => {
        const st = String(it.status || '').toLowerCase();
        return !['paid', 'cashed'].includes(st);
      });

      setDueItems(filtered);
    } catch (e: any) {
      setDueItems([]);
      setNotification({ type: 'warning', text: e?.message || 'خطا در دریافت اقساط/چک‌های سررسید' });
    } finally {
      setDueLoading(false);
    }
  };

  useEffect(() => {
    if (authReady && token) {
      // اولویت با خلاصهٔ داشبورد + لود چیدمان است تا صفحه سریع‌تر آماده شود.
      fetchDashboardData(activeTimeframe);
      if (!layoutLoaded) loadLayout();

      // کارهای غیرضروری را عقب می‌اندازیم تا لود اولیه سبک‌تر شود.
      const runDeferred = () => {
        fetchAssets();
        fetchUpcomingDue();
      };

      const w: any = window as any;
      if (typeof w.requestIdleCallback === 'function') {
        w.requestIdleCallback(runDeferred, { timeout: 1200 });
      } else {
        window.setTimeout(runDeferred, 500);
      }
    } else if (authReady && !token) {
      setLocalIsLoading(false);
      setDashboardData(null);
      setAssetValue(0);
      setAssetBreakdown({ productsValue: 0, phonesValue: 0, itemsCount: 0 });
      setDueItems([]);
      setDueRange(null);
      setLayout(DEFAULT_DASHBOARD_LAYOUT);
      try {
        localStorage.removeItem(layoutStorageKey);
      } catch {}
      setLayoutLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTimeframe, token, authReady]);

  // --------------------
  // RGL layouts per breakpoint
  // --------------------
  const colsByBp = useMemo(() => ({ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }), []);

  const layouts = useMemo(() => {
    const order = ensureMandatory(layout.order.filter((id) => Boolean(WIDGET_REGISTRY[id])));
    const sizes = layout.sizes || {};
    return {
      lg: buildPackedLayout(order, sizes, colsByBp.lg),
      md: buildPackedLayout(order, sizes, colsByBp.md),
      sm: buildPackedLayout(order, sizes, colsByBp.sm),
      xs: buildPackedLayout(order, sizes, colsByBp.xs),
      xxs: buildPackedLayout(order, sizes, colsByBp.xxs),
    };
  }, [layout.order, layout.sizes, colsByBp]);

  // فقط هنگام پایان درگ order را آپدیت کن (نه وسط حرکت، برای نرمی بیشتر)
const onDragStop = (currentLayout: Layout[]) => {
  const nextOrder = ensureMandatory(sortOrderFromLayout(currentLayout));
  setLayout((prev) => {
    const next: DashboardLayoutV2 = { ...prev, order: nextOrder };
    if (editing) scheduleSave(next);
    return next;
  });
};



  return (
    <div className="p-6 space-y-6 rtl-dashboard">
      {notification && <Notification message={notification} onClose={() => setNotification(null)} />}

      <div className="relative">
        {/* Premium background aura */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-gradient-to-br from-indigo-500/25 to-fuchsia-500/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-gradient-to-br from-emerald-500/20 to-sky-500/10 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.35),transparent_55%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_55%)]" />
        </div>
        <LiquidGlassPanel className="px-3 py-3 md:px-4 md:py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="text-right">
              <div className="flex items-center justify-end gap-2">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-md flex items-center justify-center">
                  <i className="fa-solid fa-chart-line text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-gray-50">داشبورد</h2>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 -mt-0.5">Dashboard</div>
                </div>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1">
                {editing ? 'حالت ویرایش فعال است — کارت‌ها را جابه‌جا کنید.' : 'کارت‌ها را مطابق نیازتان شخصی‌سازی کنید.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {/* Quick actions */}
              <div className="hidden sm:flex flex-wrap items-center justify-end gap-2">
                <Link
                  to="/sales/cash"
                  className="px-3 py-2 rounded-2xl text-[12px] font-extrabold bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white hover:opacity-95 transition shadow-sm ring-1 ring-black/5 dark:ring-white/10 flex items-center gap-2"
                >
                  <span className="w-8 h-8 rounded-2xl bg-white/15 flex items-center justify-center">
                    <i className="fa-solid fa-bolt" />
                  </span>
                  ثبت فروش
                </Link>

                <Link
                  to="/invoices"
                  className="px-3 py-2 rounded-2xl text-[12px] font-extrabold bg-white/70 dark:bg-gray-900/40 text-gray-900 dark:text-gray-100 hover:bg-white/90 dark:hover:bg-gray-900/55 transition shadow-sm ring-1 ring-black/5 dark:ring-white/10 flex items-center gap-2"
                >
                  <span className="w-8 h-8 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-200 flex items-center justify-center">
                    <i className="fa-solid fa-file-invoice" />
                  </span>
                  فاکتورها
                </Link>

                <Link
                  to="/reports"
                  className="px-3 py-2 rounded-2xl text-[12px] font-extrabold bg-white/70 dark:bg-gray-900/40 text-gray-900 dark:text-gray-100 hover:bg-white/90 dark:hover:bg-gray-900/55 transition shadow-sm ring-1 ring-black/5 dark:ring-white/10 flex items-center gap-2"
                >
                  <span className="w-8 h-8 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 flex items-center justify-center">
                    <i className="fa-solid fa-chart-pie" />
                  </span>
                  گزارشات
                </Link>
              </div>
              <div
                className={[
                  'px-3 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-2 select-none',
                  saveState === 'saving'
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-200'
                    : saveState === 'saved'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'
                    : saveState === 'error'
                    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-200'
                    : 'bg-gray-500/10 text-gray-600 dark:text-gray-300',
                ].join(' ')}
                title="وضعیت ذخیره‌سازی"
              >
                <i
                  className={[
                    'fa-solid',
                    saveState === 'saving'
                      ? 'fa-spinner fa-spin'
                      : saveState === 'saved'
                      ? 'fa-circle-check'
                      : saveState === 'error'
                      ? 'fa-triangle-exclamation'
                      : 'fa-cloud',
                  ].join(' ')}
                />
                {saveState === 'saving'
                  ? 'در حال ذخیره…'
                  : saveState === 'saved'
                  ? 'ذخیره شد'
                  : saveState === 'error'
                  ? 'خطا در ذخیره'
                  : 'چیدمان'}
              </div>

              <button
                onClick={toggleEditing}
                className={[
                  'px-4 py-2 rounded-2xl text-sm font-bold transition flex items-center gap-2',
                  'shadow-sm ring-1 ring-black/5 dark:ring-white/10',
                  editing
                    ? 'bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white hover:opacity-95'
                    : 'bg-white/70 dark:bg-gray-900/40 text-gray-900 dark:text-gray-100 hover:bg-white/90 dark:hover:bg-gray-900/55',
                ].join(' ')}
              >
                <span className={['w-8 h-8 rounded-2xl flex items-center justify-center', editing ? 'bg-white/15' : 'bg-indigo-500/10'].join(' ')}>
                  <i className={['fa-solid', editing ? 'fa-check' : 'fa-wand-magic-sparkles', editing ? 'text-white' : 'text-indigo-600'].join(' ')} />
                </span>
                {editing ? 'پایان ویرایش' : 'شخصی‌سازی'}
              </button>

              <button
                onClick={() => setAddModalOpen(true)}
                disabled={!editing}
                className={[
                  'px-4 py-2 rounded-2xl text-sm font-bold transition flex items-center gap-2',
                  'shadow-sm ring-1 ring-black/5 dark:ring-white/10',
                  editing
                    ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white hover:opacity-95'
                    : 'bg-gray-200/60 text-gray-500 dark:bg-gray-900/30 dark:text-gray-500 cursor-not-allowed',
                ].join(' ')}
              >
                <span className={['w-8 h-8 rounded-2xl flex items-center justify-center', editing ? 'bg-white/15' : 'bg-emerald-500/10'].join(' ')}>
                  <i className={['fa-solid fa-plus', editing ? 'text-white' : 'text-emerald-600'].join(' ')} />
                </span>
                افزودن کارت
              </button>

              <button
                onClick={resetLayout}
                className="px-4 py-2 rounded-2xl text-sm font-bold bg-white/70 dark:bg-gray-900/40 text-rose-600 dark:text-rose-300 hover:bg-white/90 dark:hover:bg-gray-900/55 transition flex items-center gap-2 shadow-sm ring-1 ring-black/5 dark:ring-white/10"
              >
                <span className="w-8 h-8 rounded-2xl flex items-center justify-center bg-rose-500/10">
                  <i className="fa-solid fa-rotate-left text-rose-600 dark:text-rose-300" />
                </span>
                ریست
              </button>
            </div>
          </div>
        </LiquidGlassPanel>
      </div>

      <div className="rtl-dashboard">
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={colsByBp}
          rowHeight={84}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          compactType="vertical"
          preventCollision={false}
          isDraggable={editing}
          isResizable={false} // تغییر اندازه فقط با دکمه خود کارت (پایدارتر)
          draggableHandle=".dash-drag-handle"
          draggableCancel="[data-rgl-no-drag]"
          useCSSTransforms={true}
          onDragStop={onDragStop}
        >
          {usedWidgetIds.map((id) => {
            const def = WIDGET_REGISTRY[id];
            if (!def) return null;

            const Component = def.Component;
            const canRemove = def.canRemove !== false;
            const preset = (layout.sizes[id] || def.defaultPreset) as SizePreset;

            return (
              <div key={id} className="h-full min-w-0">
                <WidgetShell
                  title={def.title}
                  icon={def.icon}
                  editable={editing}
                  onRemove={canRemove ? () => removeWidget(id) : undefined}
                  onResizeToggle={editing ? () => toggleSize(id) : undefined}
                  sizePreset={preset}
                >
                  {(container) => <Component ctx={ctx} container={container} />}
                </WidgetShell>
              </div>
            );
          })}
        </ResponsiveGridLayout>
      </div>

      <AddWidgetModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        available={availableToAdd}
        onAdd={addWidget}
      />
    </div>
  );
};

export default Dashboard;
