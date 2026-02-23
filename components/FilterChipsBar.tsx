import React from 'react';

export type FilterChip = {
  key: string;
  label: string;
  icon?: string; // FontAwesome class (e.g. "fa-solid fa-clock")
  count?: number;
  disabled?: boolean;
};

type Props = {
  chips: FilterChip[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
};

/**
 * A horizontally scrollable, mobile-first filter chip bar.
 * Works nicely inside TableToolbar.secondaryRow.
 */
const FilterChipsBar: React.FC<Props> = ({ chips, value, onChange, className }) => {
  return (
    <div className={className ?? ''} dir="rtl">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {chips.map((c) => {
          const active = c.key === value;
          return (
            <button
              key={c.key}
              type="button"
              disabled={c.disabled}
              onClick={() => !c.disabled && onChange(c.key)}
              className={[
                'inline-flex items-center gap-2 h-9 px-3 rounded-2xl border text-xs font-semibold whitespace-nowrap select-none transition',
                'focus:outline-none focus:ring-2 focus:ring-primary/30',
                c.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                active
                  ? 'border-primary/30 bg-primary/10 text-primary dark:bg-primary/15'
                  : 'border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10',
              ].join(' ')}
              title={c.label}
            >
              {c.icon ? <i className={c.icon} /> : null}
              <span className="max-w-[160px] truncate">{c.label}</span>
              {typeof c.count === 'number' ? (
                <span
                  className={[
                    'min-w-[22px] h-5 px-1 rounded-xl grid place-items-center text-[11px] font-black',
                    active
                      ? 'bg-primary/15 text-primary'
                      : 'bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300',
                  ].join(' ')}
                >
                  {c.count.toLocaleString('fa-IR')}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FilterChipsBar;
