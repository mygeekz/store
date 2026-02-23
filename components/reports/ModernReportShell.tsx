import React from 'react';

type Props = {
  title: string;
  subtitle?: string;
  icon?: string; // fontawesome class
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export default function ModernReportShell({ title, subtitle, icon, actions, children }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md shadow-primary/20">
              <i className={icon ?? 'fa-solid fa-chart-simple'} />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{title}</div>
              {subtitle ? (
                <div className="mt-0.5 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{subtitle}</div>
              ) : null}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/30">
        {children}
      </div>
    </div>
  );
}
