import React from 'react';
import { cn } from '@/src/lib/utils';

type Props = {
  onExport?: () => void;
  onPrint?: () => void;
  onReset?: () => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
  disabled?: boolean;
  className?: string;
};

const ActionBar: React.FC<Props> = ({ onExport, onPrint, onReset, left, right, disabled, className }) => {
  return (
    <div className={cn('app-card p-3 md:p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between', className)} dir="rtl">
      <div className="flex flex-wrap items-center gap-2">{left}</div>

      <div className="flex flex-wrap items-center gap-2 justify-end">
        {onReset && (
          <button
            type="button"
            disabled={disabled}
            onClick={onReset}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            پاک کردن فیلترها
          </button>
        )}

        {onPrint && (
          <button
            type="button"
            disabled={disabled}
            onClick={onPrint}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            چاپ
          </button>
        )}

        {onExport && (
          <button
            type="button"
            disabled={disabled}
            onClick={onExport}
            className="rounded-xl bg-gray-900 text-white px-3 py-2 text-sm hover:opacity-95 disabled:opacity-50"
          >
            خروجی اکسل
          </button>
        )}

        {right}
      </div>
    </div>
  );
};

export default ActionBar;
