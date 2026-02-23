import React from 'react';
import PageShell from './PageShell';
import TableToolbar from '@components/TableToolbar';
import ActionBar from './ActionBar';
import EmptyState from './EmptyState';
import { TableSkeleton } from './Skeletons';

type Props = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;

  // toolbar
  query?: string;
  onQueryChange?: (v: string) => void;
  searchPlaceholder?: string;
  filtersSlot?: React.ReactNode;
  toolbarRight?: React.ReactNode;
  secondaryRow?: React.ReactNode;
  stickyToolbar?: boolean;

  // action bar
  actionLeft?: React.ReactNode;
  actionRight?: React.ReactNode;
  onExport?: () => void;
  onPrint?: () => void;
  onReset?: () => void;

  // states
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;

  error?: string;

  children: React.ReactNode;
  className?: string;
};

const PageKit: React.FC<Props> = ({
  title,
  subtitle,
  icon,
  query,
  onQueryChange,
  searchPlaceholder = 'جستجو…',
  filtersSlot,
  toolbarRight,
  secondaryRow,
  stickyToolbar,
  actionLeft,
  actionRight,
  onExport,
  onPrint,
  onReset,
  isLoading,
  isEmpty,
  emptyTitle = 'داده‌ای پیدا نشد',
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  error,
  children,
  className,
}) => {
  return (
    <PageShell title={title} description={subtitle} icon={icon} className={className}>
      <div className="space-y-4 text-right max-w-7xl mx-auto px-4" dir="rtl">
        <TableToolbar
          search={typeof query === 'string' ? query : undefined}
          onSearchChange={onQueryChange}
          searchPlaceholder={searchPlaceholder}
          actions={toolbarRight}
          secondaryRow={
            <>
              {filtersSlot ? <div className="flex flex-wrap items-center gap-2">{filtersSlot}</div> : null}
              {secondaryRow ? <div className="w-full">{secondaryRow}</div> : null}
            </>
          }
          sticky={stickyToolbar}
        />
        {Boolean(onExport || onPrint || onReset || actionLeft || actionRight) && (
          <ActionBar
            left={actionLeft}
            right={actionRight}
            onExport={onExport}
            onPrint={onPrint}
            onReset={onReset}
            disabled={!!isLoading}
          />
        )}

        {error ? (
          <div className="app-card p-4 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 text-sm">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <TableSkeleton />
        ) : isEmpty ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={emptyActionLabel}
            onAction={onEmptyAction}
          />
        ) : (
          children
        )}
      </div>
    </PageShell>
  );
};

export default PageKit;
