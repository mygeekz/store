import React from 'react';

type Props = {
  title?: string;
  /** value of the search input */
  search?: string;
  /** called when search value changes */
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Right-side actions (buttons, export menu, etc.) */
  actions?: React.ReactNode;
  /** Optional extra row under the main toolbar (filter chips, secondary controls, etc.) */
  secondaryRow?: React.ReactNode;
  /** When true, makes the toolbar sticky within the page */
  sticky?: boolean;
};

/**
 * A mobile-first, RTL-friendly toolbar for list/table pages.
 * - Responsive layout: stacks on mobile, row on larger screens
 * - Safe widths: avoids overflow on small devices
 */
const TableToolbar: React.FC<Props> = ({
  title,
  search,
  onSearchChange,
  searchPlaceholder = 'جستجو…',
  actions,
  secondaryRow,
  sticky,
}) => {
  return (
    <div
      className={[
        'w-full',
        sticky ? 'sticky top-0 z-10 -mx-3 px-3 md:-mx-6 md:px-6 pt-2 pb-3 bg-bg/80 backdrop-blur' : '',
      ].join(' ')}
    >
      <div className="app-card p-3 md:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            {title ? (
              <div className="text-sm md:text-base font-semibold text-text truncate">{title}</div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
            {onSearchChange ? (
              <div className="relative w-full md:w-[320px]">
                <i className="fa-solid fa-magnifying-glass absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm" />
                <input
                  value={search ?? ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className={[
                    'w-full h-10 rounded-lg',
                    'bg-white/70 dark:bg-white/5',
                    'border border-black/10 dark:border-white/10',
                    'pr-10 pl-3 text-sm text-text placeholder:text-muted',
                    'focus:outline-none focus:ring-2 focus:ring-primary/25',
                  ].join(' ')}
                />
              </div>
            ) : null}

            {actions ? (
              <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
            ) : null}
          </div>
        </div>

        {secondaryRow ? <div className="mt-3">{secondaryRow}</div> : null}
      </div>
    </div>
  );
};

export default TableToolbar;
