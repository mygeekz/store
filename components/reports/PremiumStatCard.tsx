import React from 'react';

type Props = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info';
};

const toneClasses: Record<NonNullable<Props['tone']>, { ring: string; bg: string; text: string }> = {
  neutral: { ring: 'ring-primary/10', bg: 'bg-white/70 dark:bg-black/20', text: 'text-text' },
  good: { ring: 'ring-emerald-500/20', bg: 'bg-emerald-50/60 dark:bg-emerald-950/15', text: 'text-emerald-700 dark:text-emerald-300' },
  warn: { ring: 'ring-amber-500/25', bg: 'bg-amber-50/60 dark:bg-amber-950/15', text: 'text-amber-700 dark:text-amber-300' },
  bad: { ring: 'ring-rose-500/25', bg: 'bg-rose-50/60 dark:bg-rose-950/15', text: 'text-rose-700 dark:text-rose-300' },
  info: { ring: 'ring-sky-500/20', bg: 'bg-sky-50/60 dark:bg-sky-950/15', text: 'text-sky-700 dark:text-sky-300' },
};

const PremiumStatCard: React.FC<Props> = ({ label, value, hint, icon, tone = 'neutral' }) => {
  const t = toneClasses[tone];
  return (
    <div className={`rounded-2xl border border-primary/10 ${t.bg} ring-1 ${t.ring} p-4 md:p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted">{label}</div>
          <div className={`mt-1 text-lg md:text-xl font-semibold ${t.text} truncate`}>{value}</div>
          {hint ? <div className="mt-1 text-xs text-muted leading-5">{hint}</div> : null}
        </div>
        {icon ? (
          <div className="shrink-0 h-9 w-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center text-primary">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PremiumStatCard;
