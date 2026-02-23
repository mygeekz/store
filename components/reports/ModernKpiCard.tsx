import React from 'react';

type Props = {
  label: string;
  value: string;
  icon?: string;
  hint?: string;
};

export default function ModernKpiCard({ label, value, icon, hint }: Props) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/30">
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-gradient-to-br from-primary-500/20 to-transparent blur-2xl" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
          <div className="mt-1 truncate text-lg font-extrabold text-slate-900 dark:text-slate-100">{value}</div>
          {hint ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</div> : null}
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700 ring-1 ring-slate-200/70 transition group-hover:scale-[1.02] dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
          <i className={icon ?? 'fa-solid fa-sparkles'} />
        </div>
      </div>
    </div>
  );
}
