import React from 'react';
import { Link } from 'react-router-dom';

type Props = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
};

const PremiumReportShell: React.FC<Props> = ({ title, subtitle, icon, badge, right, children }) => {
  return (
    <div className="report-page" dir="rtl">
      <div className="report-surface report-surface-inner">
        <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-b from-primary/8 to-transparent dark:from-primary/15 dark:to-transparent p-5 md:p-6">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm text-muted">
                <Link className="hover:text-text transition-colors" to="/reports">گزارش‌ها</Link>
                <span className="opacity-60">/</span>
                <Link className="hover:text-text transition-colors" to="/reports/analysis">تحلیل پیشرفته</Link>
              </div>

              <div className="mt-3 flex items-center gap-3">
                {icon ? (
                  <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center text-primary">
                    {icon}
                  </div>
                ) : null}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl md:text-2xl font-semibold text-text truncate">{title}</h1>
                    {badge ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 border border-primary/15 text-primary">{badge}</span>
                    ) : null}
                  </div>
                  {subtitle ? (
                    <p className="mt-1 text-sm text-muted leading-6 max-w-3xl">{subtitle}</p>
                  ) : null}
                </div>
              </div>
            </div>

            {right ? (
              <div className="relative flex items-center gap-2 md:justify-end md:min-w-[220px]">
                {right}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
};

export default PremiumReportShell;
