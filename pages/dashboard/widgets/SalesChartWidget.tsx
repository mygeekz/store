import React, { useId, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { CHART_TIMEFRAMES } from '../../../constants';
import type { SalesDataPoint, ChartTimeframe } from '../../../types';
import type { DashboardWidgetProps, ChartVariant } from '../types';

const extractNumeric = (v: any): number => {
  if (v == null) return 0;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'object') {
    const k = ['sales', 'value', 'amount', 'total', 'sum', 'revenue', 'count', 'price', 'num'].find((key) =>
      Object.prototype.hasOwnProperty.call(v, key),
    );
    return k ? extractNumeric((v as any)[k]) : 0;
  }
  const s = String(v ?? '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[,،\s]/g, '')
    .replace(/تومان|ريال|ریال|IRR|IRT|tomans?|toman|rial/gi, '')
    .replace(/[^\d.-]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const chartConfig = (style: ChartVariant, isDark: boolean) => {
  // Deliberately explicit colors so the style is consistent (works for both themes)
  const base = {
    stroke: isDark ? '#A78BFA' : '#6366F1',
    fill1: isDark ? '#A78BFA' : '#6366F1',
    fill2: isDark ? '#22C55E' : '#10B981',
    strokeWidth: 3,
  };
  if (style === 'minimal') return base;
  if (style === 'glass')
    return { ...base, stroke: isDark ? '#93C5FD' : '#3B82F6', fill1: isDark ? '#93C5FD' : '#3B82F6', fill2: '#FFFFFF', strokeWidth: 3 };
  if (style === 'glow')
    return { ...base, stroke: isDark ? '#F472B6' : '#EC4899', fill1: isDark ? '#F472B6' : '#EC4899', fill2: isDark ? '#A78BFA' : '#6366F1', strokeWidth: 3 };
  if (style === 'aurora')
    return { ...base, stroke: isDark ? '#22C55E' : '#10B981', fill1: isDark ? '#22C55E' : '#10B981', fill2: isDark ? '#60A5FA' : '#3B82F6', strokeWidth: 3 };
  if (style === 'mesh')
    return { ...base, stroke: isDark ? '#FBBF24' : '#F59E0B', fill1: isDark ? '#FBBF24' : '#F59E0B', fill2: isDark ? '#A78BFA' : '#6366F1', strokeWidth: 3 };
  // neon
  return { ...base, stroke: '#22D3EE', fill1: '#22D3EE', fill2: '#A78BFA', strokeWidth: 3 };
};

export default function SalesChartWidget({ ctx, container }: DashboardWidgetProps) {
  const gradId = useId();
  const glowId = useId();
  const meshPatternId = useId();

  const isDark = ctx.isDark;
  const chartTickColor = isDark ? '#9ca3af' : '#6B7280';
  const chartGridColor = isDark ? '#2F3341' : '#e0e0e0';
  const chartTooltipBg = isDark ? '#0B1220' : 'white';
  const chartTooltipText = isDark ? '#E5E7EB' : '#374151';

  const w = container.width || 0;
  const compact = w > 0 && w < 560;
  const tiny = w > 0 && w < 420;
  const padCls = tiny ? 'p-3' : compact ? 'p-4' : 'p-5';

  const chartCfg = useMemo(() => chartConfig(ctx.chartStyle, isDark), [ctx.chartStyle, isDark]);

  const data = (ctx.dashboardData?.salesChartData || []) as SalesDataPoint[];

  const handleTimeframeChange = (timeframeKey: ChartTimeframe['key']) => {
    ctx.setActiveTimeframe(timeframeKey);
  };

  return (
    <div className={[
      'h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden',
      padCls,
    ].join(' ')}>
      <div
        className={[
          'flex items-start justify-between mb-4 text-right gap-3',
          compact ? 'flex-col' : 'flex-row items-center',
        ].join(' ')}
      >
        <h3 className={[tiny ? 'text-xs' : 'text-sm', 'font-bold text-gray-800 dark:text-gray-200'].join(' ')}>
          نمای کلی فروش
        </h3>

        <div className={['flex flex-wrap gap-2 items-center', compact ? 'w-full justify-between' : ''].join(' ')}>
          <div className={['flex space-x-2 space-x-reverse', compact ? 'overflow-x-auto max-w-full pr-1' : ''].join(' ')}>
            {CHART_TIMEFRAMES.map((timeframe) => (
              <button
                key={timeframe.key}
                onClick={() => handleTimeframeChange(timeframe.key)}
                disabled={!!ctx.showLoadingSkeletons}
                className={`${tiny ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'} rounded-lg font-medium transition-colors whitespace-nowrap ${
                  ctx.activeTimeframe === timeframe.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-600'
                }`}
              >
                {timeframe.label}
              </button>
            ))}
          </div>

          <div className={['inline-flex items-center gap-2', compact ? 'overflow-x-auto max-w-full pr-1' : ''].join(' ')}>
            {(['minimal', 'glass', 'glow', 'aurora', 'mesh', 'neon'] as ChartVariant[]).map((opt) => {
              const active = ctx.chartStyle === opt;
              return (
                <button
                  key={opt}
                  onClick={() => ctx.setChartStyle(opt)}
                  disabled={!!ctx.showLoadingSkeletons}
                  className={[
                    `${tiny ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'} rounded-lg font-medium transition-all border whitespace-nowrap`,
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-[0_8px_30px_rgba(79,70,229,0.35)]'
                      : 'bg-gray-100 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
                  ].join(' ')}
                  title={opt}
                >
                  {({
                    minimal: 'مینیمال',
                    glass: 'گلس',
                    glow: 'گلو',
                    aurora: 'اورورا',
                    mesh: 'مش',
                    neon: 'نئون',
                  } as Record<ChartVariant, string>)[opt]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="relative w-full h-[calc(100%-56px)]">
        {ctx.chartStyle === 'mesh' && (
          <svg className="absolute inset-0 h-full w-full opacity-[0.06] pointer-events-none">
            <defs>
              <pattern id={meshPatternId} width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M24 0H0V24" fill="none" stroke={isDark ? '#E5E7EB' : '#111827'} strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${meshPatternId})`} />
          </svg>
        )}

        {ctx.showLoadingSkeletons ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <i className="fas fa-spinner fa-spin text-2xl ml-2" /> در حال بارگذاری نمودار...
          </div>
        ) : data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 0, left: tiny ? 8 : 20, bottom: 8 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  {ctx.chartStyle === 'aurora' ? (
                    <>
                      <stop offset="0%" stopColor={chartCfg.fill1} stopOpacity={0.35} />
                      <stop offset="50%" stopColor={chartCfg.fill2} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={chartCfg.fill2} stopOpacity={0.06} />
                    </>
                  ) : ctx.chartStyle === 'neon' ? (
                    <>
                      <stop offset="0%" stopColor={chartCfg.fill1} stopOpacity={0.45} />
                      <stop offset="60%" stopColor={chartCfg.fill2} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={chartCfg.fill2} stopOpacity={0.04} />
                    </>
                  ) : ctx.chartStyle === 'glass' ? (
                    <>
                      <stop offset="5%" stopColor={chartCfg.fill1} stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0.08} />
                    </>
                  ) : (
                    <>
                      <stop offset="0%" stopColor={chartCfg.fill1} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={chartCfg.fill2} stopOpacity={0.05} />
                    </>
                  )}
                </linearGradient>

                {ctx.chartStyle === 'glow' && (
                  <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                )}
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis dataKey="name" tick={{ fill: chartTickColor, fontSize: tiny ? 10 : 12 }} />
              <YAxis tick={{ fill: chartTickColor, fontSize: tiny ? 10 : 12 }} tickFormatter={(v) => (Number(v) || 0).toLocaleString('fa-IR')} />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartTooltipBg,
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.35)' : '0 10px 30px rgba(0,0,0,0.12)',
                  direction: 'rtl',
                }}
                itemStyle={{ color: isDark ? '#A78BFA' : '#6366F1' }}
                labelStyle={{ color: chartTooltipText, fontWeight: 'bold' }}
                formatter={(value: any) => [ctx.formatPrice(extractNumeric(value)), 'فروش']}
              />
              <Legend wrapperStyle={{ fontSize: '12px', direction: 'rtl', color: chartTickColor }} />

              <Area
                type="monotone"
                dataKey="sales"
                stroke={chartCfg.stroke}
                fillOpacity={1}
                fill={`url(#${gradId})`}
                strokeWidth={chartCfg.strokeWidth}
                activeDot={{ r: 6 }}
                name="فروش"
                {...(ctx.chartStyle === 'glow' ? { filter: `url(#${glowId})` } : {})}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            {!ctx.token && ctx.authReady ? 'برای مشاهده اطلاعات، لطفاً ابتدا وارد شوید.' : 'داده‌ای برای نمایش وجود ندارد.'}
          </div>
        )}
      </div>
    </div>
  );
}
