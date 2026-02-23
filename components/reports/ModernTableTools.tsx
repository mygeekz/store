import React, { useMemo } from 'react';

type Props = {
  search: string;
  onSearch: (v: string) => void;
  onExportCsv?: () => void;
  onPrint?: () => void;
  right?: React.ReactNode;
  placeholder?: string;
};

export default function ModernTableTools({ search, onSearch, onExportCsv, onPrint, right, placeholder }: Props) {
  const hasActions = useMemo(() => !!onExportCsv || !!onPrint, [onExportCsv, onPrint]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-md">
        <i className="fa-solid fa-magnifying-glass pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder ?? 'جستجو...'}
          className="h-10 w-full rounded-xl border border-slate-200/70 bg-white/80 px-10 text-sm outline-none ring-0 transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {right}
        {hasActions ? (
          <div className="flex items-center gap-2">
            {onExportCsv ? (
              <button
                onClick={onExportCsv}
                className="h-10 rounded-xl border border-slate-200/70 bg-white/80 px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              >
                <i className="fa-solid fa-file-csv ml-2" />
                خروجی CSV
              </button>
            ) : null}
            {onPrint ? (
              <button
                onClick={onPrint}
                className="h-10 rounded-xl border border-slate-200/70 bg-white/80 px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              >
                <i className="fa-solid fa-print ml-2" />
                چاپ
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
