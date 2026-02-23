import React from 'react';
import { cn } from '@/src/lib/utils';

type EmptyStateProps = {
  icon?: string; // fontawesome class
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

/**
 * Consistent empty state for lists/tables/pages.
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'fa-regular fa-folder-open',
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-xl rounded-2xl border border-gray-200 bg-white/70 p-6 text-center shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/40',
        className,
      )}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
        <i className={cn(icon, 'text-2xl')} />
      </div>
      <div className="mt-4 text-base font-black text-gray-900 dark:text-gray-50">{title}</div>
      {description && (
        <div className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">{description}</div>
      )}

      {actionLabel && onAction && (
        <div className="mt-5 flex items-center justify-center">
          <button
            onClick={onAction}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
