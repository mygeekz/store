import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { DashboardWidgetContext, DashboardWidgetProps } from '../types';

type Accent = 'indigo' | 'emerald' | 'blue' | 'rose' | 'amber' | 'violet';

type Props = DashboardWidgetProps & {
  title: string;
  icon: string;
  accent: Accent;
  getValue: (ctx: DashboardWidgetContext) => string;
  hint?: string;
  detailsTo?: string;
  detailsLabel?: string;
  subtitle?: string;
};

type AccentStyle = {
  gradient: string;
  glow: string;
};

const ACCENTS: Record<Accent, AccentStyle> = {
  indigo: {
    gradient: 'from-indigo-600 via-violet-600 to-fuchsia-600',
    glow: 'bg-indigo-400/25',
  },
  emerald: {
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    glow: 'bg-emerald-400/25',
  },
  blue: {
    gradient: 'from-sky-600 via-indigo-600 to-blue-700',
    glow: 'bg-sky-400/25',
  },
  rose: {
    gradient: 'from-rose-600 via-pink-600 to-fuchsia-600',
    glow: 'bg-rose-400/25',
  },
  amber: {
    gradient: 'from-amber-600 via-orange-600 to-rose-600',
    glow: 'bg-amber-400/25',
  },
  violet: {
    gradient: 'from-violet-600 via-purple-600 to-indigo-600',
    glow: 'bg-violet-400/25',
  },
};

type Mode = 'xs' | 'sm' | 'md' | 'lg';

function getMode(width: number, height: number): Mode {
  const w = width || 0;
  const h = height || 0;
  const tight = h > 0 && h < 110;

  if (w < 230 || tight) return 'xs';
  if (w < 320) return 'sm';
  if (w < 430) return 'md';
  return 'lg';
}

const MODE_CLASSES: Record<
  Mode,
  { pad: string; title: string; value: string; hint: string; iconBox: string; icon: string }
> = {
  xs: {
    pad: 'p-3',
    title: 'text-[11px] leading-4 font-semibold',
    value: 'text-[16px] leading-5 font-black',
    hint: 'text-[10px] leading-4',
    iconBox: 'w-9 h-9 rounded-2xl',
    icon: 'text-[14px]',
  },
  sm: {
    pad: 'p-4',
    title: 'text-[12px] leading-4 font-semibold',
    value: 'text-[18px] leading-6 font-black',
    hint: 'text-[10px] leading-4',
    iconBox: 'w-10 h-10 rounded-2xl',
    icon: 'text-[16px]',
  },
  md: {
    pad: 'p-5',
    title: 'text-[13px] leading-5 font-semibold',
    value: 'text-[22px] leading-7 font-black',
    hint: 'text-[11px] leading-4',
    iconBox: 'w-11 h-11 rounded-2xl',
    icon: 'text-[18px]',
  },
  lg: {
    pad: 'p-6',
    title: 'text-sm leading-5 font-semibold',
    value: 'text-3xl leading-8 font-black',
    hint: 'text-xs leading-4',
    iconBox: 'w-12 h-12 rounded-2xl',
    icon: 'text-xl',
  },
};

export default function KPIWidget({
  ctx,
  container,
  title,
  icon,
  accent,
  getValue,
  hint,
  detailsTo,
  detailsLabel,
  subtitle,
}: Props) {
  const mode = useMemo(() => getMode(container.width, container.height), [container.width, container.height]);
  const st = MODE_CLASSES[mode];
  const a = ACCENTS[accent] || ACCENTS.indigo;

  if (ctx.showLoadingSkeletons) {
    return (
      <div className="h-full rounded-2xl overflow-hidden bg-white dark:bg-gray-900/40 ring-1 ring-black/5 dark:ring-white/10">
        <div className="p-4 h-full animate-pulse">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 ml-3">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
              <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
            </div>
          </div>
          <div className="mt-4 h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className={[
        'relative h-full rounded-2xl overflow-hidden text-white',
        'shadow-md ring-1 ring-black/10',
        'bg-gradient-to-br',
        a.gradient,
      ].join(' ')}
    >
      {/* Soft blobs */}
      <div className={['pointer-events-none absolute -left-12 -top-14 w-40 h-40 rounded-full blur-2xl', a.glow].join(' ')} />
      <div className="pointer-events-none absolute -right-14 -bottom-16 w-52 h-52 rounded-full bg-white/10 blur-2xl" />

      {/* Content */}
      <div className={['relative h-full flex flex-col justify-between', st.pad].join(' ')}>
        <div className="flex items-start justify-between gap-3">
          <div className={[st.iconBox, 'shrink-0 bg-white/15 backdrop-blur ring-1 ring-white/25 flex items-center justify-center'].join(' ')}>
            <i className={[icon, st.icon].join(' ')} />
          </div>

          <div className="min-w-0 flex-1 text-right">
            <div className={[st.title, 'opacity-95 line-clamp-2'].join(' ')}>{title}
              {subtitle ? <div className="text-[11px] opacity-85 mt-0.5">{subtitle}</div> : null}</div>
            <div className={[st.value, 'mt-2 whitespace-nowrap overflow-hidden text-ellipsis'].join(' ')}>
              {getValue(ctx)}
            </div>
          </div>
        </div>

        <div className={[st.hint, 'opacity-90 mt-3 flex items-center justify-between gap-2'].join(' ')}>
          {detailsTo ? (
            <Link
              to={detailsTo}
              data-rgl-no-drag
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="opacity-90 hover:opacity-100 transition flex items-center gap-2"
            >
              <i className="fa-solid fa-up-right-from-square text-[10px] opacity-80" />
              <span className="truncate">{detailsLabel || 'جزئیات'}</span>
            </Link>
          ) : (
            <span className="opacity-80 flex items-center gap-2">
              <i className="fa-solid fa-up-right-from-square text-[10px] opacity-80" />
              <span className="truncate">{detailsLabel || 'جزئیات'}</span>
            </span>
          )}

          {hint ? <span className="opacity-90 line-clamp-1">{hint}</span> : <span className="opacity-0">.</span>}
        </div>
      </div>
    </div>
  );
}
